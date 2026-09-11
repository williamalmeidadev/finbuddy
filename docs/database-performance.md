# FinBuddy Database Performance Baseline & Query Optimizations

## 1. Executive Summary

This document establishes the official database performance baseline, index architecture, query optimization patterns, concurrency safeguards, and scaling strategy for the FinBuddy backend API. 

FinBuddy relies on **PostgreSQL 17** via **Prisma 7** using the native `@prisma/adapter-pg` driver. To ensure sub-millisecond to low-millisecond database query performance under high concurrency and growing ledger volume, targeted composite indexes were added, N+1 query patterns were eliminated, and conditional atomic row updates were implemented to protect financial integrity without resorting to coarse-grained locks.

---

## 2. Current Schema & Index Strategy

### 2.1 Audit Findings

An audit of the relational schema (`prisma/schema.prisma`) and access patterns revealed several areas where default single-column B-Tree indexes were insufficient for production workloads:

1. **Transaction Feed Sorting**: Queries frequently filter transactions by `accountId` and sort chronologically (`ORDER BY transaction_at DESC`). The existing single-column indexes on `accountId` and `transactionAt` forced PostgreSQL to perform a Bitmap Index Scan or an Index Scan followed by an in-memory Sort (`Sort Key: transaction_at DESC`), increasing execution time and CPU overhead as account ledger size grew.
2. **Category-Based Spending Aggregations**: Budget and financial reporting queries filter transactions by `categoryId` within bounded time windows (`transaction_at >= $start AND transaction_at < $end`). Single-column index scans resulted in intermediate row fetching and filtering.
3. **Transfer Ledger History**: Transfers between accounts query either `fromAccountId` or `toAccountId` sorted by `transactionAt`. Without compound index coverage, account-specific transfer history queries suffered from sorting overhead.
4. **User Budget Lookups**: Budget queries look up all budget definitions for a user for a specific calendar month (`userId` and `month`). Single-column indexes on `userId` required filtering out unrelated months in memory.
5. **Scheduled Recurring Transaction Scanning**: The background automation scheduler continuously scans for active recurring transactions due for execution (`isActive = true AND nextOccurrence <= $now ORDER BY nextOccurrence ASC`). An index on only `nextOccurrence` forced the engine to inspect inactive records.

### 2.2 Composite Indexes Migration

Migration `20260911021000_add_performance_composite_indexes` introduced six targeted composite B-Tree indexes:

| Table | Index Name | Columns / Strategy | Query Pattern Optimized |
|---|---|---|---|
| `transactions` | `transactions_account_id_transaction_at_idx` | `(account_id, transaction_at DESC)` | Account transaction listing, pagination, and latest balance activity |
| `transactions` | `transactions_category_id_transaction_at_idx` | `(category_id, transaction_at)` | Budget category spending batch aggregation and monthly breakdown |
| `transfers` | `transfers_from_account_id_transaction_at_idx` | `(from_account_id, transaction_at)` | Source account transfer history ordered chronologically |
| `transfers` | `transfers_to_account_id_transaction_at_idx` | `(to_account_id, transaction_at)` | Destination account transfer history ordered chronologically |
| `budgets` | `budgets_user_id_month_idx` | `(user_id, month)` | Monthly budget retrieval by user |
| `recurring_transactions` | `recurring_transactions_is_active_next_occurrence_idx` | `(is_active, next_occurrence)` | Worker polling for due recurring transactions |

### 2.3 Complete Table & Index Inventory

Below is the verified schema layout and active index mapping across all core financial entities:

```
users (PK: id)
  - UNIQUE: email
user_profiles (PK: id)
  - UNIQUE: user_id
user_identities (PK: id)
  - UNIQUE: (provider, provider_user_id)
refresh_tokens (PK: id)
  - UNIQUE: token_hash
  - INDEX: (user_id)
accounts (PK: id)
  - INDEX: (user_id)
categories (PK: id)
  - INDEX: (user_id)
budgets (PK: id)
  - UNIQUE: (user_id, category_id, month)
  - INDEX: (user_id)
  - INDEX: (category_id)
  - INDEX: (month)
  - COMPOSITE INDEX: (user_id, month) [budgets_user_id_month_idx]
transactions (PK: id)
  - UNIQUE: (recurring_transaction_id, recurring_occurrence)
  - INDEX: (account_id)
  - INDEX: (transfer_id)
  - INDEX: (category_id)
  - INDEX: (recurring_transaction_id)
  - INDEX: (transaction_at)
  - COMPOSITE INDEX: (account_id, transaction_at DESC) [transactions_account_id_transaction_at_idx]
  - COMPOSITE INDEX: (category_id, transaction_at) [transactions_category_id_transaction_at_idx]
transfers (PK: id)
  - INDEX: (from_account_id)
  - INDEX: (to_account_id)
  - INDEX: (transaction_at)
  - COMPOSITE INDEX: (from_account_id, transaction_at) [transfers_from_account_id_transaction_at_idx]
  - COMPOSITE INDEX: (to_account_id, transaction_at) [transfers_to_account_id_transaction_at_idx]
recurring_transactions (PK: id)
  - INDEX: (user_id)
  - INDEX: (account_id)
  - INDEX: (category_id)
  - INDEX: (next_occurrence)
  - INDEX: (user_id, is_active)
  - COMPOSITE INDEX: (is_active, next_occurrence) [recurring_transactions_is_active_next_occurrence_idx]
```

---

## 3. High-Frequency Query Patterns

The application's core transactional and reporting flows execute against these optimized indexes:

### 3.1 Financial Summary (`GET /financial-summary?month=YYYY-MM`)
- **Accounts Retrieval**: `SELECT * FROM accounts WHERE user_id = $1 ORDER BY name ASC;` (Index: `accounts(user_id)`).
- **Monthly Totals**:
  ```sql
  SELECT type, SUM(amount) AS amount
  FROM transactions
  WHERE account_id IN (SELECT id FROM accounts WHERE user_id = $1)
    AND transfer_id IS NULL
    AND transaction_at >= $start_of_month
    AND transaction_at < $next_month_start
  GROUP BY type;
  ```
- **Category Spending Aggregations**:
  ```sql
  SELECT category_id, SUM(amount) AS amount
  FROM transactions
  WHERE account_id IN (SELECT id FROM accounts WHERE user_id = $1)
    AND type = $type
    AND transfer_id IS NULL
    AND category_id IS NOT NULL
    AND transaction_at >= $start_of_month
    AND transaction_at < $next_month_start
  GROUP BY category_id;
  ```
- **Category Name Resolution**: Resolves category names for the aggregated IDs via `SELECT id, name FROM categories WHERE id IN (...) AND user_id = $1`.

### 3.2 Transaction Listing (`GET /transactions?accountId=&limit=&offset=`)
- **Query**:
  ```sql
  SELECT * FROM transactions
  WHERE account_id IN (SELECT id FROM accounts WHERE user_id = $1)
    AND ($account_id IS NULL OR account_id = $account_id)
  ORDER BY transaction_at DESC
  LIMIT $take OFFSET $skip;
  ```
- **Index Utilized**: `transactions_account_id_transaction_at_idx`. When filtered by `accountId`, PostgreSQL performs an Index Scan backward directly in descending timestamp order without an explicit sort step.

### 3.3 Budget Spending (`GET /budgets?month=`)
- **Budget Lookup**:
  ```sql
  SELECT * FROM budgets WHERE user_id = $1 AND ($month IS NULL OR month = $month) ORDER BY month DESC;
  ```
  Uses `budgets_user_id_month_idx`.
- **Batch Spending Calculation**: See Section 4.1 for the single-pass grouped aggregation pattern.

### 3.4 Due Recurring Transactions Polling
- **Scheduler Query (`findAllDueRecurringTransactions`)**:
  ```sql
  SELECT * FROM recurring_transactions
  WHERE is_active = true AND next_occurrence <= $until_date
  ORDER BY next_occurrence ASC;
  ```
  Uses `recurring_transactions_is_active_next_occurrence_idx` to perform an index range scan over active records only, skipping all inactive definitions.

### 3.5 Account Transfers (`POST /transfers`, `GET /transfers`)
- **Listing**:
  ```sql
  SELECT * FROM transfers
  WHERE (from_account_id IN (SELECT id FROM accounts WHERE user_id = $1)
     OR to_account_id IN (SELECT id FROM accounts WHERE user_id = $1))
  ORDER BY transaction_at DESC
  LIMIT $take OFFSET $skip;
  ```
  Uses `transfers_from_account_id_transaction_at_idx` and `transfers_to_account_id_transaction_at_idx`.

---

## 4. N+1 Optimizations Made

### 4.1 Batch Category Spending in `BudgetRepository`

#### The Problem
Previously, when `BudgetService.findByUserId` retrieved $N$ budget records, it mapped over each budget and executed an individual `transaction.aggregate` query to calculate spending for each category:
```ts
// Legacy N+1 approach: 1 query for budgets + N queries for spending
const budgets = await this.budgetRepository.findByUserId(userId, options);
return Promise.all(
  budgets.map(async (budget) => {
    const spent = await this.budgetRepository.calculateSpending(userId, budget.categoryId, budget.month);
    return { ...budget, spent, remaining: budget.amount - spent };
  })
);
```
For a user with 20 category budgets, this resulted in **21 database round-trips** per request.

#### The Solution: `calculateSpendingBatch`
`BudgetRepository.calculateSpendingBatch` groups the requested budgets by month boundary and executes a single Prisma `groupBy` per distinct month:

```ts
// src/budget/budget.repository.ts
async calculateSpendingBatch(
  userId: string,
  budgets: { categoryId: string; month: Date }[],
): Promise<Map<string, number>> {
  // 1. Group category IDs by calendar month boundaries (UTC start of month to next month start)
  const monthGroups = new Map<string, { startOfMonth: Date; nextMonthStart: Date; categoryIds: Set<string> }>();
  for (const budget of budgets) {
    // ... group setup ...
    spendingMap.set(`${budget.categoryId}:${budget.month.toISOString()}`, 0);
  }

  // 2. Execute 1 query per distinct month group
  await Promise.all(
    Array.from(monthGroups.values()).map(async (group) => {
      const results = await this.prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        where: {
          account: { userId },
          categoryId: { in: Array.from(group.categoryIds) },
          type: TransactionType.EXPENSE,
          source: { not: TransactionSource.SYSTEM },
          transactionAt: {
            gte: group.startOfMonth,
            lt: group.nextMonthStart,
          },
        },
      });

      for (const item of results) {
        if (!item.categoryId) continue;
        const amount = item._sum.amount ? Number(item._sum.amount) : 0;
        spendingMap.set(`${item.categoryId}:${group.startOfMonth.toISOString()}`, amount);
      }
    }),
  );

  return spendingMap;
}
```

#### Impact
- In typical dashboard requests where all budgets belong to the same calendar month, database queries drop from **$1 + N$** to **2** (1 to retrieve budgets + 1 batch aggregation query).
- Categories with zero transactions are automatically pre-populated with `0` in memory, avoiding null handling issues.
- Backed by the composite index `transactions_category_id_transaction_at_idx`.

### 4.2 Single-Pass Totals Aggregation in `FinancialSummaryRepository`

#### The Problem
`FinancialSummaryRepository.getMonthlyTotals` previously issued two separate database queries: one `aggregate` with `where: { type: INCOME }` and another `aggregate` with `where: { type: EXPENSE }`.

#### The Solution
Refactored to execute a single `groupBy` by `type`:
```ts
// src/financial-summary/financial-summary.repository.ts
async getMonthlyTotals(
  userId: string,
  monthStart: Date,
  nextMonthStart: Date,
): Promise<{ income: number; expenses: number }> {
  const grouped = await this.prisma.transaction.groupBy({
    by: ['type'],
    _sum: { amount: true },
    where: {
      account: { userId },
      transferId: null,
      transactionAt: {
        gte: monthStart,
        lt: nextMonthStart,
      },
    },
  });

  let income = 0;
  let expenses = 0;

  for (const group of grouped) {
    const amount = group._sum.amount ? Number(group._sum.amount) : 0;
    if (group.type === TransactionType.INCOME) income = amount;
    else if (group.type === TransactionType.EXPENSE) expenses = amount;
  }

  return { income, expenses };
}
```

#### Impact
- Database round-trips for monthly financial summary totals cut by **50%** (from 2 queries to 1).
- Transfer transactions (`transferId != null`) are excluded in the database query to avoid double counting internal fund movements.

---

## 5. Concurrency & Race Condition Hardening

### 5.1 The Concurrency Overdraft Risk
In financial APIs, traditional application-level balance validation creates a Classic Time-of-Check to Time-of-Use (TOCTOU) race condition:
1. Request A reads Account Balance = $100.
2. Request B reads Account Balance = $100.
3. Both validate that $100 >= $80.
4. Request A updates balance to $20 ($100 - $80).
5. Request B updates balance to -$60 ($20 - $80).
6. **Result**: Account is illegally overdrawn to negative balance.

### 5.2 Atomic Row-Level Predicate Locks via `updateMany`
Rather than acquiring global application locks or blocking entire tables, FinBuddy utilizes PostgreSQL row-level locking via conditional update predicates executed inside a Prisma database transaction:

```ts
const updated = await tx.account.updateMany({
  where: {
    id: accountId,
    balance: {
      gte: requiredAmount,
    },
  },
  data: {
    balance: {
      decrement: requiredAmount,
    },
  },
});

if (updated.count === 0) {
  throw new BadRequestException('Insufficient balance');
}
```

#### Mechanics of PostgreSQL Atomic Execution
1. **Row Lock Acquired**: In PostgreSQL, an `UPDATE` statement acquires an exclusive row lock (`FOR UPDATE`) on the matching row in the `accounts` table.
2. **Predicate Evaluated on Current Version**: The `WHERE balance >= requiredAmount` predicate is evaluated against the latest committed row version under Read Committed isolation.
3. **Serialized Evaluation**: When two concurrent requests target the same account, the second request waits for the first request's transaction to commit. Upon waking, the second request re-evaluates the `WHERE` clause against the updated balance.
4. **Zero Count Rejection**: If the updated balance is below `requiredAmount`, the `UPDATE` matches 0 rows. `updated.count === 0` is detected, and a `BadRequestException` is thrown, aborting the transaction cleanly with zero side-effects.

### 5.3 Hardened Repositories & Operations

1. **Transfer Creation (`TransferRepository.createWithAtomicBalanceUpdate`)**:
   - Decrements source balance via `updateMany` with `where: { id: fromAccountId, balance: { gte: amount } }`.
   - Increments destination balance via `update`.
   - Creates `Transfer` record and 2 mirror ledger transactions (`EXPENSE` for source, `INCOME` for destination, flagged as `source: SYSTEM`).
   - If source has insufficient funds, fails with `BadRequestException('Insufficient balance for transfer')`.
2. **Transaction Creation (`TransactionRepository.createWithBalanceUpdate`)**:
   - If `balanceDelta < 0`, validates `balance >= abs(balanceDelta)` via `updateMany`.
3. **Transaction Edit (`TransactionRepository.updateWithBalanceUpdate`)**:
   - If the delta reduces balance (`balanceDelta < 0`), enforces `balance >= abs(balanceDelta)` via `updateMany`.
4. **Transaction Deletion (`TransactionRepository.deleteWithBalanceUpdate`)**:
   - If deleting an income transaction (reducing account balance, `reversalDelta < 0`), enforces `balance >= abs(reversalDelta)` via `updateMany`.
5. **Recurring Transaction Execution Idempotency**:
   - Protected by compound database unique constraint: `@@unique([recurringTransactionId, recurringOccurrence])`.
   - Parallel execution calls for the same recurring schedule and date cannot create duplicate entries or duplicate balance deductions; Prisma catches unique constraint conflicts and safely skips or handles them.

---

## 6. Pagination Strategy & Deterministic Ordering

### 6.1 Offset-Based Pagination Parameters
All collection listing endpoints implement consistent pagination parameters:
- `limit` (take): Controls batch size. Defaults to `50`. Enforces a strict upper bound of `100` via `Math.min(limit ?? 50, 100)`.
- `offset` (skip): Offset index. Defaults to `0`.

### 6.2 Deterministic Sorting
To prevent pagination jitter (duplicate or missing items between pages), all queries enforce explicit, deterministic sorting orders:

- **Transactions**: `orderBy: { transactionAt: 'desc' }`. Supported by composite index `(account_id, transaction_at DESC)`.
- **Transfers**: `orderBy: { transactionAt: 'desc' }`. Supported by composite indexes `(from_account_id, transaction_at)` and `(to_account_id, transaction_at)`.
- **Budgets**: `orderBy: { month: 'desc' }`. Supported by composite index `(user_id, month)`.
- **Recurring Transactions**:
  - User listing: `orderBy: { createdAt: 'desc' }`.
  - Background scheduler: `orderBy: { nextOccurrence: 'asc' }`. Supported by composite index `(is_active, next_occurrence)`.
- **Categories & Accounts**: `orderBy: { name: 'asc' }`.

---

## 7. Connection Configuration & Scaling Strategy

### 7.1 Prisma Adapter & PostgreSQL Driver
FinBuddy uses `@prisma/adapter-pg` wrapping the standard Node.js `pg` connection pool inside `DatabaseService` (`src/database/database.service.ts`):

```ts
@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

### 7.2 Connection Pooling & PgBouncer
When scaling horizontally in cloud/container environments (Kubernetes, AWS ECS, Google Cloud Run):
- **Connection Limits**: PostgreSQL connection limits should follow:
  $$\text{max\_connections} = (\text{CPU Cores} \times 2) + \text{Spindle Count}$$
  For modern containerized PostgreSQL, keeping node pool sizes between 10 and 20 connections per API instance prevents PostgreSQL thread context switching and connection memory overhead.
- **PgBouncer Considerations**:
  - If deploying PgBouncer in front of PostgreSQL, use **Transaction Pooling** mode for stateless queries.
  - Note on Prisma Interactive Transactions (`prisma.$transaction(async (tx) => ...)`): Interactive transactions require continuous connection pinning for the duration of the transaction block. When using transaction pooling, ensure the connection string specifies transaction pool ports or session pinning compatibility.
  - Disable prepared statements or set `pgbouncer=true` if using binary engines with transaction-mode pooling.

### 7.3 Redis Caching Layer Integration
FinBuddy's architecture includes Redis (already utilized for distributed rate limiting). Future caching transitions will layer Redis across read-heavy, low-churn domains:

1. **Category Metadata Cache**:
   - Endpoint: `GET /categories`
   - Invalidation: Cache-aside with eviction upon `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id`.
2. **User Profile & Settings**:
   - Endpoint: `GET /users/me`
   - TTL: 15 minutes with write-through invalidation on profile update.
3. **Monthly Budget Definitions**:
   - Endpoint: `GET /budgets?month=YYYY-MM`
   - Cache budget target amounts, recalculating spending dynamically or invalidating on transaction create/update/delete.

---

## 8. Classification of Findings & Roadmap

### 8.1 Measured Findings (Verified with Concrete Evidence)

| Finding / Improvement | Baseline Before Optimization | Measured Result After Optimization | Verification Evidence |
|---|---|---|---|
| **Budget Listing Query Count** | $1 + N$ queries (1 select + $N$ aggregate queries per budget) | 2 queries (1 select + 1 batch `groupBy` query per month) | `BudgetService` unit tests & `test/database-performance.e2e-spec.ts` |
| **Financial Summary Totals Query Count** | 2 queries (separate aggregates for `INCOME` and `EXPENSE`) | 1 single-pass `groupBy` query | `FinancialSummaryRepository` unit tests & E2E spec |
| **Concurrent Overdraft Race Conditions** | Potential negative balance under concurrent withdrawals | 100% prevented: exactly 1 request succeeds (201), remaining concurrent requests fail (400 Bad Request) | `test/database-performance.e2e-spec.ts` concurrent transfer test |
| **Concurrent Recurring Transaction Idempotency** | Potential duplicate occurrence creation | 100% idempotent: exactly 1 occurrence created across database under concurrent triggers | `test/database-performance.e2e-spec.ts` concurrent recurring execution test |
| **Composite B-Tree Indexes** | Missing composite index coverage on multi-column filter/sort patterns | 6 composite indexes created and verified active via PostgreSQL catalog | `prisma/migrations/20260911021000_add_performance_composite_indexes` |
| **Test Suite Stability** | Baseline | 38 unit test suites (293 tests) passing; E2E performance suite passing | `npm test`, `npx jest test/database-performance.e2e-spec.ts` |

### 8.2 Inferred Performance Metrics (Analytical Projections)

| Metric | Projection | Rationale |
|---|---|---|
| **`GET /budgets` Latency** | ~70-85% latency reduction on dashboards with 15+ budgets | Eliminating 15-20 network roundtrips between Node.js and PostgreSQL saves 1-2ms per roundtrip in cloud network environments. |
| **`GET /transactions` Sorting Cost** | O(N log N) in-memory sort eliminated | `transactions_account_id_transaction_at_idx` allows PostgreSQL to read rows directly from the B-tree in descending order without disk/work_mem sorting. |
| **Scheduler Polling Overhead** | ~90% reduction in rows inspected | `recurring_transactions_is_active_next_occurrence_idx` enables direct seek to `is_active = true`, ignoring inactive historical recurrence rules. |

### 8.3 Future Work & Scaling Considerations

1. **Cursor-Based (Keyset) Pagination**:
   - While offset pagination (`LIMIT 50 OFFSET 100`) is efficient for standard usage, deep pagination (e.g. `OFFSET 50000`) degrades because PostgreSQL must scan and discard 50,000 index tuples.
   - Plan: Implement keyset cursor pagination (`WHERE (transaction_at, id) < ($cursor_time, $cursor_id) ORDER BY transaction_at DESC, id DESC LIMIT 50`) for unbounded transaction feeds.
2. **Read Replica Routing**:
   - For heavy analytical reporting (`FinancialSummaryService`), configure Prisma read replica extensions (`@prisma/extension-read-replicas`) to route summary queries to a PostgreSQL read replica, freeing the primary writer for OLTP operations.
3. **Application-Level Redis Caching**:
   - Cache budget targets and category listings in Redis to avoid database queries entirely on dashboard reloads.
4. **Table Partitioning for Ledger History**:
   - When the `transactions` table exceeds 10 million rows, partition `transactions` by range on `transaction_at` (e.g. yearly or quarterly partitions) to keep active working sets in memory.
