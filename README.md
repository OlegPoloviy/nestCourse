# HW - TRANSACTIONS

Please look inside of the `lesson5` directory (sorry for the mess in other folders).

## 1. Transaction Implementation

I implemented a safe, atomic transaction for order creation using `dataSource.transaction`.

**Key steps inside the transaction:**
1.  **Validation:** First, I used  DTOs  to ensure data is valid
2.  **Deadlock Prevention:** Incoming product IDs are sorted before processing. This ensures that concurrent requests always lock resources in the same order
3.  **Stock Check & Update:** Operations are performed within the transaction scope. If any step fails the entire transaction rolls back automatically.

## 2. Concurrency Control 

**Chosen Approach:** Pessimistic Locking (`SELECT ... FOR UPDATE`).

**Why?**
We just can`t sell the item`s, that we dont have. For an optimistic case, we will need a lot more complex retry logic.

**Implementation:**
* Used TypeORM's `setLock('pessimistic_write')`.
* This locks the product rows until the transaction commits or rolls back, preventing race conditions.

## 3. Idempotency (Double-Submit Safe)

To prevent duplicate orders during timeouts or retries, I implemented an idempotency mechanism based on `idempotencyKey`.

**How it works:**
1.   Before starting a transaction, check if an order with this key already exists. If yes  return it immediately.
2.   The `orders` table has a `UNIQUE` constraint on `idempotencyKey`.
3.   If two requests arrive exactly at the same time, the second one will trigger a specific database error . The service catches this error and returns the existing order instead of failing.

**Result:** True idempotency that survives network timeouts and parallel requests.

## 4. SQL Optimization

**Target Query:** Fetching top-20 most expensive products (catalog filter).
Query: `SELECT * FROM "Products" WHERE price > 1000 ORDER BY price DESC LIMIT 20;`

### Analysis

**1. Before Optimization:**
```text
Limit  (cost=4811.09..4811.14 rows=20 width=717) (actual time=36.647..36.651 rows=20.00 loops=1)
  Buffers: shared hit=3967
  ->  Sort  (cost=4811.09..4844.13 rows=13213 width=717) (actual time=36.646..36.648 rows=20.00 loops=1)
        Sort Key: price DESC
        Sort Method: top-N heapsort  Memory: 34kB
        Buffers: shared hit=3967
        ->  Seq Scan on "Products"  (cost=0.00..4459.50 rows=13213 width=717) (actual time=0.011..23.280 rows=159854.00 loops=1)
              Filter: (price > '1000'::numeric)
              Rows Removed by Filter: 40149
              Buffers: shared hit=3964
Planning:
  Buffers: shared hit=45
Planning Time: 0.241 ms
Execution Time: 36.664 ms
```

**2. Optimization Applied:**
* Added index on `price` column via Entity decorator:
    ```typescript
    @Index('IDX_PRODUCT_PRICE_DESC', ['price'])
    ```

**3. After Optimization:**
```text

Limit  (cost=0.42..2.99 rows=20 width=124) (actual time=0.042..0.139 rows=20.00 loops=1)
  Buffers: shared hit=20 read=3
  ->  Index Scan Backward using "IDX_PRODUCT_PRICE_DESC" on "Products"  (cost=0.42..20394.41 rows=158971 width=124) (actual time=0.042..0.137 rows=20.00 loops=1)
        Index Cond: (price > '1000'::numeric)
        Index Searches: 1
        Buffers: shared hit=20 read=3
Planning:
  Buffers: shared hit=181 read=1
Planning Time: 0.540 ms
Execution Time: 0.153 ms
```
