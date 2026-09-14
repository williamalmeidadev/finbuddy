# Frontend Server-State Caching Architecture (TanStack Query)

## Overview

FinBuddy utilizes **TanStack Query v5** (`@tanstack/react-query`) as the primary frontend server-state management and caching layer in `apps/web`.

> **Key Security Guarantee:**
> TanStack Query is a performance and UX layer. PostgreSQL through the NestJS API remains the source of truth for financial data.

---

## Centralized QueryClient Configuration

The `QueryClient` is initialized with conservative defaults tailored specifically for financial security and integrity:

- **In-Memory Caching:** Server-state is cached exclusively in application memory (`queryClient`). No financial data, account balances, transactions, or AI messages are ever persisted to `localStorage`, `sessionStorage`, `IndexedDB`, or browser storage.
- **Controlled Stale Times:** 1 minute default stale time (`staleTime: 60000ms`), with static reference data (e.g. categories) using 5 minutes (`staleTime: 300000ms`).
- **No Window Focus Refetch Spams:** Disabled automatic refetch on window focus (`refetchOnWindowFocus: false`) to avoid excessive backend requests when switching browser tabs.
- **Selective Network Retries:** Automatic retries apply strictly to temporary network/5xx failures (max 2 retries). 400, 401, 403, 404, 422 errors and financial mutations (`mutations.retry: false`) are **NEVER** retried automatically to prevent duplicate financial operations.

---

## Query Key Factory Architecture

All query keys are managed through a centralized, strongly typed factory (`apps/web/src/lib/query/query-keys.ts`):

- `accounts.list()`, `accounts.detail(id)`
- `transactions.list(filters)`
- `transfers.list(filters)`
- `categories.list(filters)`
- `budgets.list(month, categoryId)`
- `recurringTransactions.list(filters)`
- `financialSummary.month(monthStr)`
- `profile.all`
- `ai.conversations()`, `ai.messages(conversationId)`, `ai.memories()`

Every filter parameter (e.g. `page`, `type`, `month`, `accountId`) produces a distinct, non-colliding query key array.

---

## Authentication & User Session Isolation

1. **Authentication Recovery:** TanStack Query operates on top of the existing `apiClient`. If an API call receives a `401 Unauthorized`, `apiClient` attempts a single refresh token exchange before retrying. TanStack Query does not interfere with this logic nor cause infinite retry loops.
2. **Session Logout & Multi-User Security:**
   - On explicit logout or auth failure in `AuthContext`, `clearQueryCacheOnLogout()` triggers `queryClient.clear()`.
   - On login, `clearQueryCacheOnLogout()` is executed prior to fetching new data.
   - This prevents any possibility of User A's cached financial data leaking into User B's session.

---

## Mutation Lifecycle & Targeted Query Invalidation

Financial mutations follow the **authoritative backend flow**: no optimistic balance updates are performed in the browser.

```text
User Submits Mutation → Pending State → Backend Processing → Response Confirmed → Targeted Invalidation → Refetch Authoritative State
```

### Targeted Invalidation Matrix:
- **Transaction Created / Updated / Deleted:** Invalidates `transactions`, `accounts`, `financialSummary`, `budgets`.
- **Transfer Created / Updated / Deleted:** Invalidates `transfers`, `transactions`, `accounts`, `financialSummary`.
- **Category Created / Updated / Deleted:** Invalidates `categories`, `transactions`, `budgets`, `financialSummary`.
- **Budget Created / Updated / Deleted:** Invalidates `budgets`, `financialSummary`.
- **Recurring Transaction Created / Updated / Deleted:** Invalidates `recurringTransactions`, `transactions`, `accounts`, `financialSummary`.
- **AI Action Confirmed (`approveConfirmation`):** Invalidates `ai`, `transactions`, `accounts`, `transfers`, `financialSummary`, `budgets`.

---

## AI Agent Integration

- AI conversations, message history, and memories are cached strictly in memory via TanStack Query.
- All AI message requests route through `FinBuddy API` (`POST /ai-agent/messages`).
- AI confirmation approvals (`POST /ai-agent/confirmations/:id/approve`) and cancellations (`POST /ai-agent/confirmations/:id/reject`) trigger targeted invalidations of affected financial queries upon backend confirmation.
- Direct browser calls to OpenAI are prohibited; API keys are never exposed on the frontend.
