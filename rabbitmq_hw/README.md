# Rabbitmq worker hw
In this homwework I've implemented a worker service for my order domains

## Topology
orders.process - main queue. When the user sends a request to create an order, the API responds immediately with the order in status **PENDING**. The service then publishes a message to this queue with `orderId`, `messageId`, `attempt`, and `items` (product id, quantity, etc.). The worker consumes from here, processes the order (status → PROCESSED, processedAt), and uses republish for retries. 
orders.dlq - dead letter queue. If we have some error that will fail every time and will block our queue or worker (toxic error) we will send this message to a dlq after some retries.
I used one custom exchange: **dlx.exchange** (direct, durable). It is the dead letter exchange. When a message is nack'd from `orders.process`, RabbitMQ sends it to `dlx.exchange`, which routes it to `orders.dlq`. For publishing to the main queue we use the default (nameless) exchange — we just send to the queue by name.

## Routing keys
For orders - just explicit exchange route by queue name
DLQ: binding is `dlx.exchange` to `orders.dlq` with routing key **orders.dlq**. When a message is dead-lettered from `orders.process`, it is published to `dlx.exchange` with this routing key.

## Delivering messages
1. User creates order → API returns PENDING and publishes to **orders.process** (messageId, orderId, attempt 0, items).
2. Worker takes message from **orders.process**. Success → ack (message gone). Idempotent (already processed) → ack. Error and attempt < max → delay, republish to **orders.process** with attempt+1, ack original. Error and attempt ≥ max → nack → message goes to **dlx.exchange** → **orders.dlq**.
3. Invalid message (e.g. bad JSON) → nack → same path to **orders.dlq**.

## How to check everyting
1. Open http://localhost:15672 (login e.g. guest/guest or from .env).
2. **Queues** - see `orders.process` and `orders.dlq`. Check Ready/Total and message rates.
3. To see a message in DLQ: publish a message with a fake `orderId` to `orders.process`, wait for retries to exhaust, then open `orders.dlq` and use "Get messages" — you will see the payload and `x-death` headers.
4. **Exchanges** - open `dlx.exchange`, check bindings to `orders.dlq` with routing key `orders.dlq`.

5. 
