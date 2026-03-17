# Microservices (Orders + Payments)

Monorepo: **orders-service** (NestJS HTTP API + RabbitMQ consumer) and **payments-service** (NestJS gRPC server). Orders calls Payments over gRPC for authorization and payment status.

## Prerequisites

- Node.js ≥ 18
- pnpm (or npm)
- PostgreSQL (two instances or two databases: one for orders, one for payments)
- RabbitMQ

## Install

From each apps folders:

```bash
pnpm install
```

## Environment

Copy `.env.example` to `.env` in app root and set:

- **Orders:** `DB_*`, `RABBITMQ_URL`, `JWT_*`, optional AWS/S3 and MinIO for files
- **Payments:** `PAYMENTS_DB_*`
- **Orders → Payments:** `PAYMENTS_GRPC_URL` (default `localhost:50051`), `PAYMENTS_GRPC_TIMEOUT_MS`

## Running the services

1. Start PostgreSQL (x2) and RabbitMQ (e.g. via Docker or locally).
2. Run migrations (and seed for orders) in `apps/orders-service` and `apps/payments-service`.
3. Start from root **payments-service** (gRPC on port 50051):
   ```bash
   pnpm run start:payments
   ```
4. Start **orders-service** (HTTP on port 3000):
   ```bash
   pnpm run start:orders
   ```

API base URL: `http://localhost:3000/api` (or the port you configure).


## E2E: Orders → Payments.Authorize → paymentId and status

So for example, you can call integrated Swagger or postman

Creation of order
```json
{
  "idempotencyKey": "c4e8a2b9-1f73-4d6a-9b5c-0a7e3d2f8c61",
  "userId": "5b770938-9b70-416b-bba5-1516dec0e966",
  "items": [
    {
      "productId": "b5107610-1a39-492f-9d2d-dbaa0d7b1e06",
      "quantity": 10
    }
  ]
}
```

Response body
```json
{
  "id": "59e6629d-10b8-4a62-b977-595b3db5554c",
  "userId": "5b770938-9b70-416b-bba5-1516dec0e966",
  "status": "PROCESSED",
  "courierId": null,
  "idempotencyKey": "c4e8a2b9-1f73-4d6a-9b5c-0a7e3d2f8c61",
  "paymentId": "44c1db9b-114d-46e4-9288-c95aea5f1b23",
  "createdAt": "2026-03-17T21:35:33.079Z",
  "updatedAt": "2026-03-17T21:35:33.120Z",
  "processedAt": "2026-03-17T21:35:33.637Z",
  "items": [
    {
      "id": "6ed493ea-efd4-488c-93c1-df190bbd49db",
      "orderId": "59e6629d-10b8-4a62-b977-595b3db5554c",
      "productId": "b5107610-1a39-492f-9d2d-dbaa0d7b1e06",
      "quantity": 10,
      "priceAtPurchase": 79.99
    }
  ]
}
```
And logs for microservice and monorepo
```text
yment id. Order was not created.
[Nest] 30000  - 17.03.2026, 23:35:33     LOG [OrdersService] Payment authorized for order 59e6629d-10b8-4a62-b977-595b3db5554c, paymentId=44c1db9b-114d-46e4-9288-c95aea5f1b23
[Nest] 30000  - 17.03.2026, 23:35:33     LOG [OrdersProcessorService] Handle message start: messageId=fb9815e7-37be-49f7-965a-71f514e97f18, orderId=59e6629d-10b8-4a62-b977-595b3db5554c, attempt=0
[Nest] 30000  - 17.03.2026, 23:35:33     LOG [OrdersService] Processing order from queue: 59e6629d-10b8-4a62-b977-595b3db5554c
[Nest] 30000  - 17.03.2026, 23:35:33     LOG [OrdersService] Order 59e6629d-10b8-4a62-b977-595b3db5554c status changed to PROCESSED
[Nest] 30000  - 17.03.2026, 23:35:33     LOG [OrdersProcessorService] Handle message result=success: messageId=fb9815e7-37be-49f7-965a-71f514e97f18, orderId=59e6629d-10b8-4a62-b977-595b3db5554c, attempt=0
```
Microservice
```
as created)
[Nest] 29916  - 17.03.2026, 23:35:33     LOG [PaymentsGRPCController] Authorizing payment for order: 59e6629d-10b8-4a62-b977-595b3db5554c
[Nest] 29916  - 17.03.2026, 23:35:48     LOG [PaymentsGRPCController] Getting status for payment: 44c1db9b-114d-46e4-9288-c95aea5f1b23
```
## Orders and RabbitMQ
Also we can call endpoint for getting payment status
```bash
curl -X 'GET' \
  'http://localhost:3000/api/orders/59e6629d-10b8-4a62-b977-595b3db5554c/payment-status' \
  -H 'accept: */*'
```
Result 
```json
{
  "paymentId": "44c1db9b-114d-46e4-9288-c95aea5f1b23",
  "paymentStatus": "1"
}
```

- Create order → status **PENDING**; worker consumes `orders.process` and moves order to **PROCESSED**.

## About protobuf
I stored protocol buffer in the root of project, and configured each module to only read it, so one modules are imported between each other

```typescript
 const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    PaymentsServiceModule,
    {
      transport: Transport.GRPC,
      options: {
        package: 'payments.v1',
        protoPath: join(__dirname, '../../../contracts/proto/payments.proto'),
        url: microserviceUrl,
      },
    },
```

```typescript
ClientsModule.registerAsync([
      {
        name: 'PAYMENTS_GRPC_CLIENT',
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'payments.v1',
            protoPath: join(
              process.cwd(),
              '../../contracts/proto/payments.proto',
            ),
            url: config.get<string>('PAYMENTS_GRPC_URL', 'localhost:50051'),
          },
        }),
      },
    ]),
```
