# Rabbitmq worker hw

In this homework I've implemented a worker service for my order domains

# How to run everything

Copy `.env.example` to `.env` and adjust values. The API reads **`RABBITMQ_URL`** (AMQP connection string). Inside Docker Compose the hostname must be the service name **`rabbitmq`** (default in `.env.example`).

Run everything on Docker

```bash
pnpm docker:dev:build
```

Than you will have access to postgres, rabbitmq, minio and api itself

To run migrations

```bash
pnpm docker:migrate
```

And seeds

```bash
pnpm docker:seed
```

## Topology

orders.process - main queue. When the user sends a request to create an order, the API responds immediately with the order in status **PENDING**. The service then publishes a message to this queue with `orderId`, `messageId`, `attempt`, and `items` (product id, quantity, etc.). The worker consumes from here, processes the order (status → PROCESSED, processedAt), and uses republish for retries.
orders.dlq - dead letter queue. If we have some error that will fail every time and will block our queue or worker (toxic error) we will send this message to a dlq after some retries.
I used one custom exchange: **dlx.exchange** (direct, durable). It is the dead letter exchange. When a message is nack'd from `orders.process`, RabbitMQ sends it to `dlx.exchange`, which routes it to `orders.dlq`. For publishing to the main queue we use the default (nameless) exchange — we just send to the queue by name.

## Retry mechanism

I've chosen the simpliest way of retry strategy - republish message to queue with one more attempt, if the attepts is more than we have choosen, we send the message to dlq

## Routing keys

For orders - just explicit exchange route by queue name
DLQ: binding is `dlx.exchange` to `orders.dlq` with routing key **orders.dlq**. When a message is dead-lettered from `orders.process`, it is published to `dlx.exchange` with this routing key.

## Delivering messages

1. User creates order → API returns PENDING and publishes to **orders.process** (messageId, orderId, attempt 0, items).
2. Worker takes message from **orders.process**. Success → ack (message gone). Idempotent (already processed) → ack. Error and attempt < max → delay, republish to **orders.process** with attempt+1, ack original. Error and attempt ≥ max → nack → message goes to **dlx.exchange** → **orders.dlq**.
3. Invalid message (e.g. bad JSON) → nack → same path to **orders.dlq**.

## How to check everything

1. Open `http://127.0.0.1:${RABBITMQ_MGMT_PORT:-15672}` (login e.g. guest/guest or from `.env`).
2. **Queues** — see `orders.process` and `orders.dlq`. Check Ready/Total and message rates.
3. To see a message in DLQ: publish a message with a fake `orderId` to `orders.process`, wait for retries to exhaust, then open `orders.dlq` and use "Get messages" — you will see the payload and `x-death` headers.
4. **Exchanges** — open `dlx.exchange`, check bindings to `orders.dlq` with routing key `orders.dlq`.

## Deterministic smoke check (curl + queue counters)

Copy/paste in **bash** (Git Bash / WSL / macOS / Linux). Requires **`curl`**, **`jq`**, and a UUID generator (`uuidgen` or `python3`). Assumes the stack is up (`pnpm docker:dev:build`), with **`pnpm docker:migrate`** and **`pnpm docker:seed`** already run, and `.env` loaded in the shell (or defaults below match your DB credentials).

```bash
COMPOSE='docker compose -f compose.yaml -f compose.dev.yaml'
API="http://127.0.0.1:${DEV_PORT:-3001}/api"
RMQ="http://127.0.0.1:${RABBITMQ_MGMT_PORT:-15672}"
AUTH="${RABBIT_USER:-guest}:${RABBIT_PASSWORD:-guest}"

uuid() { uuidgen 2>/dev/null | tr '[:upper:]' '[:lower:]' || python3 -c "import uuid; print(uuid.uuid4())"; }

# 0) Queues exist (HTTP 200 from Management API)
curl -fsS -u "$AUTH" "$RMQ/api/queues/%2F/orders.process" >/dev/null && echo "orders.process: ok"
curl -fsS -u "$AUTH" "$RMQ/api/queues/%2F/orders.dlq" >/dev/null && echo "orders.dlq: ok"

# 1) Seeded user + product from Postgres
DB_U="${DB_USER:-postgres}"
DB_N="${DB_NAME:-postgres}"
USER_ID=$($COMPOSE exec -T db psql -U "$DB_U" -d "$DB_N" -tAc 'SELECT id::text FROM "user" ORDER BY email LIMIT 1;' | tr -d '\r')
PRODUCT_ID=$($COMPOSE exec -T db psql -U "$DB_U" -d "$DB_N" -tAc 'SELECT id::text FROM "Products" ORDER BY sku LIMIT 1;' | tr -d '\r')

# 2) POST /orders → 201, status PENDING
IDK=$(uuid)
BODY=$(jq -n --arg u "$USER_ID" --arg k "$IDK" --arg p "$PRODUCT_ID" \
  '{idempotencyKey:$k,userId:$u,items:[{productId:$p,quantity:1}]}')
CREATE_CODE=$(curl -sS -o /tmp/rmq-hw-order.json -w "%{http_code}" -H "Content-Type: application/json" -d "$BODY" "$API/orders")
test "$CREATE_CODE" = "201" && jq -e '.status=="PENDING"' /tmp/rmq-hw-order.json >/dev/null && echo "create: ok (201 PENDING)"
ORDER_ID=$(jq -r .id /tmp/rmq-hw-order.json)

# 3) Happy path → PROCESSED
for _ in {1..15}; do
  ST=$(curl -fsS "$API/orders/$ORDER_ID" | jq -r .status)
  if test "$ST" = "PROCESSED"; then echo "happy path: ok"; break; fi
  sleep 1
done

# 4) Retry / DLQ — poison message (invalid order UUID path in worker)
DLQ_BEFORE=$(curl -fsS -u "$AUTH" "$RMQ/api/queues/%2F/orders.dlq" | jq .messages)
BAD_MID=$(uuid)
PAYLOAD=$(jq -n --arg m "$BAD_MID" '{messageId:$m,orderId:"00000000-0000-0000-0000-000000000001",attempt:0}' -c)
curl -fsS -u "$AUTH" -H "Content-Type: application/json" -X POST \
  "$RMQ/api/exchanges/%2F/amq.default/publish" \
  -d "$(jq -n --arg p "$PAYLOAD" '{properties:{},routing_key:"orders.process",payload:$p,payload_encoding:"string"}')" >/dev/null
sleep 8
DLQ_AFTER=$(curl -fsS -u "$AUTH" "$RMQ/api/queues/%2F/orders.dlq" | jq .messages)
test "$DLQ_AFTER" -gt "$DLQ_BEFORE" && echo "dlq: ok ($DLQ_BEFORE → $DLQ_AFTER messages)"

# 5) Idempotency — republish same messageId; processed_messages row count stays 1
MSG_ID=$($COMPOSE exec -T db psql -U "$DB_U" -d "$DB_N" -tAc "SELECT message_id::text FROM processed_messages WHERE order_id='${ORDER_ID}'::uuid LIMIT 1;" | tr -d '\r')
PC_BEFORE=$($COMPOSE exec -T db psql -U "$DB_U" -d "$DB_N" -tAc "SELECT COUNT(*)::text FROM processed_messages WHERE message_id='${MSG_ID}'::uuid;" | tr -d '\r')
PAYLOAD2=$(jq -n --arg m "$MSG_ID" --arg o "$ORDER_ID" '{messageId:$m,orderId:$o,attempt:0}' -c)
curl -fsS -u "$AUTH" -H "Content-Type: application/json" -X POST \
  "$RMQ/api/exchanges/%2F/amq.default/publish" \
  -d "$(jq -n --arg p "$PAYLOAD2" '{properties:{},routing_key:"orders.process",payload:$p,payload_encoding:"string"}')" >/dev/null
sleep 3
PC_AFTER=$($COMPOSE exec -T db psql -U "$DB_U" -d "$DB_N" -tAc "SELECT COUNT(*)::text FROM processed_messages WHERE message_id='${MSG_ID}'::uuid;" | tr -d '\r')
test "$PC_BEFORE" = "1" && test "$PC_AFTER" = "1" && echo "idempotency: ok (single processed_messages row)"
```

**Expected highlights:** step 2 prints `create: ok`, step 3 `happy path: ok`, step 4 `dlq: ok`, step 5 `idempotency: ok`. If a step is silent, inspect `docker compose ... logs api` and the RabbitMQ UI.

# Proofs

## Happy path

After creating order

```json
{
  "userId": "cde2b630-1c97-4178-b5ed-5973229af196",
  "status": "PENDING",
  "idempotencyKey": "8c9d8a1f-7c6b-4f41-9d6c-1e2b0b6a5d73",
  "courierId": null,
  "processedAt": null,
  "id": "6a5176e3-630e-436c-a185-4e5fafc790d9",
  "createdAt": "2026-03-12T22:27:59.698Z",
  "updatedAt": "2026-03-12T22:27:59.698Z"
}
```

And if I make the same request again

```json
{
  "id": "6a5176e3-630e-436c-a185-4e5fafc790d9",
  "userId": "cde2b630-1c97-4178-b5ed-5973229af196",
  "status": "PROCESSED",
  "courierId": null,
  "idempotencyKey": "8c9d8a1f-7c6b-4f41-9d6c-1e2b0b6a5d73",
  "createdAt": "2026-03-12T22:27:59.698Z",
  "updatedAt": "2026-03-12T22:27:59.729Z",
  "processedAt": "2026-03-12T22:28:00.272Z",
  "items": [
    {
      "id": "59c07a89-8133-4da6-af7f-b975ad9e617e",
      "orderId": "6a5176e3-630e-436c-a185-4e5fafc790d9",
      "productId": "32fc5e48-7982-4b94-a6c4-d1d2dfd5f991",
      "quantity": 10,
      "priceAtPurchase": 19.99
    }
  ]
}
```

## Retry

To trigger a retry I just logged into rabbitmq management console and added an message with invalid product id to the queue

And the result is

```
at", "order_id", "handler") VALUES ($1, $2, $3, $4)
api-1     | [Nest] 46  - 03/12/2026, 10:32:21 PM   ERROR [OrdersProcessorService] Handle message result=error: messageId=fail-test-1, orderId=00000000-0000-0000-0000-000000000001, attempt=1, reason=invalid input syntax for type uuid: "fail-test-1"
api-1     | QueryFailedError: invalid input syntax for type uuid: "fail-test-1"
api-1     |     at PostgresQueryRunner.query (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/driver/src/driver/postgres/PostgresQueryRunner.ts:325:19)
api-1     |     at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
api-1     |     at async InsertQueryBuilder.execute (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/query-builder/src/query-builder/InsertQueryBuilder.ts:164:33)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/orders/orders.service.ts:118:9)
api-1     |     at async EntityManager.transaction (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/entity-manager/src/entity-manager/EntityManager.ts:156:28)
api-1     |     at async OrdersProcessorService.handleMessage (/usr/src/app/src/modules/orders/orders-processor.service.ts:53:9)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/orders/orders-processor.service.ts:24:7)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/rabbitmq/rabbitmq.service.ts:101:9)
api-1     | [Nest] 46  - 03/12/2026, 10:32:21 PM     LOG [OrdersProcessorService] Handle message result=retry: messageId=fail-test-1, orderId=00000000-0000-0000-0000-000000000001, attempt=1, nextAttempt=2
api-1     | [Nest] 46  - 03/12/2026, 10:32:22 PM     LOG [OrdersProcessorService] Handle message start: messageId=fail-test-1, orderId=00000000-0000-0000-0000-000000000001, attempt=2
db-1      | 2026-03-12 22:32:22.868 UTC [2643] ERROR:  invalid input syntax for type uuid: "fail-test-1"
db-1      | 2026-03-12 22:32:22.868 UTC [2643] CONTEXT:  unnamed portal parameter $1 = '...'
db-1      | 2026-03-12 22:32:22.868 UTC [2643] STATEMENT:  INSERT INTO "processed_messages"("message_id", "processed_at", "order_id", "handler") VALUES ($1, $2, $3, $4)
api-1     | [Nest] 46  - 03/12/2026, 10:32:22 PM   ERROR [OrdersProcessorService] Handle message result=error: messageId=fail-test-1, orderId=00000000-0000-0000-0000-000000000001, attempt=2, reason=invalid input syntax for type uuid: "fail-test-1"
api-1     | QueryFailedError: invalid input syntax for type uuid: "fail-test-1"
api-1     |     at PostgresQueryRunner.query (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/driver/src/driver/postgres/PostgresQueryRunner.ts:325:19)
api-1     |     at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
api-1     |     at async InsertQueryBuilder.execute (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/query-builder/src/query-builder/InsertQueryBuilder.ts:164:33)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/orders/orders.service.ts:118:9)
api-1     |     at async EntityManager.transaction (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/entity-manager/src/entity-manager/EntityManager.ts:156:28)
api-1     |     at async OrdersProcessorService.handleMessage (/usr/src/app/src/modules/orders/orders-processor.service.ts:53:9)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/orders/orders-processor.service.ts:24:7)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/rabbitmq/rabbitmq.service.ts:101:9)
api-1     | [Nest] 46  - 03/12/2026, 10:32:22 PM     LOG [OrdersProcessorService] Handle message result=retry: messageId=fail-test-1, orderId=00000000-0000-0000-0000-000000000001, attempt=2, nextAttempt=3
api-1     | [Nest] 46  - 03/12/2026, 10:32:23 PM     LOG [OrdersProcessorService] Handle message start: messageId=fail-test-1, orderId=00000000-0000-0000-0000-000000000001, attempt=3
db-1      | 2026-03-12 22:32:23.878 UTC [2643] ERROR:  invalid input syntax for type uuid: "fail-test-1"
db-1      | 2026-03-12 22:32:23.878 UTC [2643] CONTEXT:  unnamed portal parameter $1 = '...'
db-1      | 2026-03-12 22:32:23.878 UTC [2643] STATEMENT:  INSERT INTO "processed_messages"("message_id", "processed_at", "order_id", "handler") VALUES ($1, $2, $3, $4)
api-1     | [Nest] 46  - 03/12/2026, 10:32:23 PM   ERROR [OrdersProcessorService] Handle message result=error: messageId=fail-test-1, orderId=00000000-0000-0000-0000-000000000001, attempt=3, reason=invalid input syntax for type uuid: "fail-test-1"
api-1     | QueryFailedError: invalid input syntax for type uuid: "fail-test-1"
api-1     |     at PostgresQueryRunner.query (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/driver/src/driver/postgres/PostgresQueryRunner.ts:325:19)
api-1     |     at process.processTicksAndRejections (node:internal/process/task_queues:95:5)
api-1     |     at async InsertQueryBuilder.execute (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/query-builder/src/query-builder/InsertQueryBuilder.ts:164:33)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/orders/orders.service.ts:118:9)
api-1     |     at async EntityManager.transaction (/usr/src/app/node_modules/.pnpm/typeorm@0.3.28_pg@8.18.0_ts-node@10.9.2_@types+node@20.19.30_typescript@5.9.3_/node_modules/typeorm/entity-manager/src/entity-manager/EntityManager.ts:156:28)
api-1     |     at async OrdersProcessorService.handleMessage (/usr/src/app/src/modules/orders/orders-processor.service.ts:53:9)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/orders/orders-processor.service.ts:24:7)
api-1     |     at async <anonymous> (/usr/src/app/src/modules/rabbitmq/rabbitmq.service.ts:101:9)
api-1     | [Nest] 46  - 03/12/2026, 10:32:23 PM   ERROR [OrdersProcessorService] Handle message result=dlq: messageId=fail-test-1, orderId=00000000-0000-0000-0000-000000000001, attempt=3


w Enable Watch
```

And we will have that message in dlq:

```
Message 2
The server reported 0 messages remaining.

Exchange	dlx.exchange
Routing Key	orders.dlq
Redelivered	○
Properties
delivery_mode:	2
headers:
x-death:
count:	1
exchange:
queue:	orders.process
reason:	rejected
routing-keys:	orders.process
time:	1773354743
x-first-death-exchange:
x-first-death-queue:	orders.process
x-first-death-reason:	rejected
x-last-death-exchange:
x-last-death-queue:	orders.process
x-last-death-reason:	rejected
content_type:	application/json
Payload
88 bytes
Encoding: string
{"messageId":"fail-test-1","orderId":"00000000-0000-0000-0000-000000000001","attempt":3}
```

## Idempotency

To test this I'll just use my existing order payload from 1 step and take the mesaage id from processed_messages table
{
"messageId": "cac0166b-f6a5-4218-a241-96eff8b48d9f",
"orderId": "6a5176e3-630e-436c-a185-4e5fafc790d9",
"attempt": 0
}

And the result is

```
i-1     | [Nest] 46  - 03/12/2026, 10:40:37 PM    WARN [OrdersService] Message cac0166b-f6a5-4218-a241-96eff8b48d9f already processed. Skipping...
api-1     | [Nest] 46  - 03/12/2026, 10:40:37 PM     LOG [OrdersProcessorService] Handle message result=success(idempotent): messageId=cac0166b-f6a5-4218-a241-96eff8b48d9f, orderId=6a5176e3-630e-436c-a185-4e5fafc790d9, attempt=0

```
