# Phase 25 — Frontend Server-State Caching with TanStack Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate TanStack Query into `apps/web` as the in-memory server-state and caching layer while maintaining PostgreSQL/NestJS backend authority, secure authentication token handling, and zero browser-storage persistence of financial data.

**Architecture:** Create a centralized `QueryClient` with conservative financial defaults (no aggressive retries, disabled refetch-on-focus, in-memory cache), a typed `queryKeys` factory, domain-specific custom query/mutation hooks with targeted cache invalidation, and migrate all frontend pages incrementally.

**Tech Stack:** `@tanstack/react-query`, React 19, React Router 7, Vite 6, TypeScript, Vitest, Playwright.

**Spec:** User prompt Phase 25 requirement directives.

## Global Constraints

- **Cache Lifetime:** In-memory ONLY. No `localStorage`, `sessionStorage`, `IndexedDB`, or `persistQueryClient`.
- **Backend Authority:** Backend remains authoritative for balance calculations, mutations, authorization, and confirmation. No optimistic balance updates.
- **Authentication:** Must reuse existing `apiClient` and `tokenStorage`. Must NOT interfere with 401 refresh token interceptor. On logout, MUST execute `queryClient.clear()`.
- **AI Integration:** AI requests MUST route through `FinBuddy API` endpoints (`/ai-agent/messages`, `/ai-agent/confirmations/*`). Never call OpenAI directly from browser.

---

### Task 1: Install `@tanstack/react-query` & Create Centralized QueryClient Configuration

**Files:**
- Create: `apps/web/src/lib/query/query-client.ts`
- Modify: `apps/web/package.json`
- Test: `apps/web/__tests__/query-client.test.ts`

**Interfaces:**
- Produces: `queryClient` instance, `clearQueryCacheOnLogout()` helper function.

- [ ] **Step 1: Install `@tanstack/react-query` package**

Run command in root: `npm install @tanstack/react-query --workspace=apps/web`

- [ ] **Step 2: Create `query-client.ts` with conservative financial defaults**

```typescript
import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default stale time
      gcTime: 5 * 60 * 1000, // 5 minutes in-memory garbage collection time
      refetchOnWindowFocus: false, // Avoid excessive refetches when switching tabs
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Do not retry 401, 403, 400, 404 or validation errors
        if (error instanceof ApiError) {
          if ([400, 401, 403, 404, 422].includes(error.statusCode)) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false, // Financial mutations must not auto-retry to prevent duplicates
    },
  },
});

export const clearQueryCacheOnLogout = () => {
  queryClient.clear();
};
```

- [ ] **Step 3: Write unit tests for QueryClient and retry policy**

Create `apps/web/__tests__/query-client.test.ts`:

```typescript
import { queryClient, clearQueryCacheOnLogout } from "../src/lib/query/query-client";
import { ApiError } from "../src/lib/api/errors";

describe("QueryClient Configuration", () => {
  it("should have correct default options", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("should not retry on 401 or 400 ApiErrors", () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry as Function;
    expect(retryFn(1, new ApiError(401, "Unauthorized"))).toBe(false);
    expect(retryFn(1, new ApiError(400, "Bad Request"))).toBe(false);
    expect(retryFn(1, new ApiError(500, "Server Error"))).toBe(true);
    expect(retryFn(2, new ApiError(500, "Server Error"))).toBe(false);
  });

  it("should clear query cache on logout", () => {
    queryClient.setQueryData(["test-key"], { data: "sample" });
    expect(queryClient.getQueryData(["test-key"])).toBeDefined();
    clearQueryCacheOnLogout();
    expect(queryClient.getQueryData(["test-key"])).toBeUndefined();
  });
});
```

- [ ] **Step 4: Run unit tests**

Run: `npm run test --prefix apps/web`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json package-lock.json apps/web/src/lib/query/query-client.ts apps/web/__tests__/query-client.test.ts
git commit -m "feat(web): configure QueryClient with conservative financial defaults and clearQueryCacheOnLogout"
```

---

### Task 2: Create Typed Query Key Architecture

**Files:**
- Create: `apps/web/src/lib/query/query-keys.ts`
- Test: `apps/web/__tests__/query-keys.test.ts`

**Interfaces:**
- Produces: `queryKeys` factory object.

- [ ] **Step 1: Create `query-keys.ts`**

```typescript
export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    lists: () => [...queryKeys.accounts.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.accounts.lists(), filters] as const,
    details: () => [...queryKeys.accounts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.accounts.details(), id] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    lists: () => [...queryKeys.transactions.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.transactions.lists(), filters] as const,
    details: () => [...queryKeys.transactions.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
  },
  transfers: {
    all: ["transfers"] as const,
    lists: () => [...queryKeys.transfers.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.transfers.lists(), filters] as const,
    details: () => [...queryKeys.transfers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.transfers.details(), id] as const,
  },
  categories: {
    all: ["categories"] as const,
    lists: () => [...queryKeys.categories.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.categories.lists(), filters] as const,
    details: () => [...queryKeys.categories.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.categories.details(), id] as const,
  },
  budgets: {
    all: ["budgets"] as const,
    lists: () => [...queryKeys.budgets.all, "list"] as const,
    list: (month?: string, categoryId?: string) => [...queryKeys.budgets.lists(), { month, categoryId }] as const,
    details: () => [...queryKeys.budgets.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.budgets.details(), id] as const,
  },
  recurringTransactions: {
    all: ["recurringTransactions"] as const,
    lists: () => [...queryKeys.recurringTransactions.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.recurringTransactions.lists(), filters] as const,
    details: () => [...queryKeys.recurringTransactions.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.recurringTransactions.details(), id] as const,
  },
  financialSummary: {
    all: ["financialSummary"] as const,
    month: (monthStr?: string) => [...queryKeys.financialSummary.all, monthStr || "current"] as const,
  },
  profile: {
    all: ["profile"] as const,
  },
  ai: {
    all: ["ai"] as const,
    conversations: (page = 1, limit = 20) => [...queryKeys.ai.all, "conversations", { page, limit }] as const,
    conversation: (id: string) => [...queryKeys.ai.all, "conversation", id] as const,
    messages: (conversationId: string, page = 1, limit = 50) => [...queryKeys.ai.all, "messages", conversationId, { page, limit }] as const,
    memories: () => [...queryKeys.ai.all, "memories"] as const,
  },
};
```

- [ ] **Step 2: Create unit test `apps/web/__tests__/query-keys.test.ts`**

```typescript
import { queryKeys } from "../src/lib/query/query-keys";

describe("Query Keys Architecture", () => {
  it("should generate distinct query keys for different filter parameters", () => {
    const listA = queryKeys.transactions.list({ page: 1, limit: 10 });
    const listB = queryKeys.transactions.list({ page: 2, limit: 10 });
    expect(listA).not.toEqual(listB);
  });

  it("should generate distinct query keys for financial summary months", () => {
    const sumSep = queryKeys.financialSummary.month("2026-09");
    const sumAug = queryKeys.financialSummary.month("2026-08");
    expect(sumSep).not.toEqual(sumAug);
  });
});
```

- [ ] **Step 3: Run unit tests**

Run: `npm run test --prefix apps/web`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/query/query-keys.ts apps/web/__tests__/query-keys.test.ts
git commit -m "feat(web): add typed queryKeys factory architecture"
```

---

### Task 3: Mount `QueryClientProvider` and Integrate Auth Logout Clearing

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/lib/auth/auth-context.tsx`
- Test: `apps/web/__tests__/auth-logout-cache.test.ts`

- [ ] **Step 1: Wrap App with `QueryClientProvider`**

In `apps/web/src/App.tsx`, import `QueryClientProvider` from `@tanstack/react-query` and `queryClient` from `@/lib/query/query-client`. Wrap the root routes with `<QueryClientProvider client={queryClient}>`.

- [ ] **Step 2: Call `clearQueryCacheOnLogout()` on logout in `auth-context.tsx`**

Update `logout()` in `AuthContext`:
```typescript
const logout = async () => {
  try {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
  } catch (err) {
    console.error("Error logging out from server:", err);
  } finally {
    tokenStorage.clearTokens();
    clearQueryCacheOnLogout(); // Clears all TanStack Query cache in memory
    setUser(null);
  }
};
```

- [ ] **Step 3: Test logout cache clearing**

Create `apps/web/__tests__/auth-logout-cache.test.ts`:
Verify that when `logout` or `clearQueryCacheOnLogout` is called, `queryClient.getQueryCache().clear()` is executed.

- [ ] **Step 4: Run tests and commit**

```bash
npm run test --prefix apps/web
git add apps/web/src/App.tsx apps/web/src/lib/auth/auth-context.tsx apps/web/__tests__/auth-logout-cache.test.ts
git commit -m "feat(web): mount QueryClientProvider and clear query cache on auth logout"
```

---

### Task 4: Create Domain Query and Mutation Custom Hooks

**Files:**
- Create: `apps/web/src/lib/queries/accounts.ts`
- Create: `apps/web/src/lib/queries/transactions.ts`
- Create: `apps/web/src/lib/queries/transfers.ts`
- Create: `apps/web/src/lib/queries/categories.ts`
- Create: `apps/web/src/lib/queries/budgets.ts`
- Create: `apps/web/src/lib/queries/recurring-transactions.ts`
- Create: `apps/web/src/lib/queries/financial-summary.ts`
- Create: `apps/web/src/lib/queries/profile.ts`
- Create: `apps/web/src/lib/queries/ai.ts`

- [ ] **Step 1: Implement hooks with targeted query invalidations**

Targeted invalidation rules:
- Transaction mutations -> invalidate `queryKeys.transactions.all`, `queryKeys.accounts.all`, `queryKeys.financialSummary.all`, `queryKeys.budgets.all`.
- Transfer mutations -> invalidate `queryKeys.transfers.all`, `queryKeys.transactions.all`, `queryKeys.accounts.all`, `queryKeys.financialSummary.all`.
- Category mutations -> invalidate `queryKeys.categories.all`, `queryKeys.transactions.all`, `queryKeys.budgets.all`, `queryKeys.financialSummary.all`.
- Budget mutations -> invalidate `queryKeys.budgets.all`, `queryKeys.financialSummary.all`.
- Recurring transaction mutations -> invalidate `queryKeys.recurringTransactions.all`, `queryKeys.transactions.all`, `queryKeys.accounts.all`, `queryKeys.financialSummary.all`.
- AI confirmations -> invalidate `queryKeys.ai.all`, `queryKeys.transactions.all`, `queryKeys.accounts.all`, `queryKeys.transfers.all`, `queryKeys.financialSummary.all`, `queryKeys.budgets.all`.

- [ ] **Step 2: Add unit tests for hooks & invalidations**

Test that mutations trigger expected `invalidateQueries` calls.

- [ ] **Step 3: Commit query hooks**

```bash
git add apps/web/src/lib/queries/
git commit -m "feat(web): add custom query and mutation hooks with targeted cache invalidation"
```

---

### Task 5: Migrate Frontend Pages to TanStack Query Hooks

**Files:**
- Modify: `apps/web/src/pages/DashboardPage.tsx`
- Modify: `apps/web/src/pages/AccountsPage.tsx`
- Modify: `apps/web/src/pages/TransactionsPage.tsx`
- Modify: `apps/web/src/pages/TransfersPage.tsx`
- Modify: `apps/web/src/pages/CategoriesPage.tsx`
- Modify: `apps/web/src/pages/BudgetsPage.tsx`
- Modify: `apps/web/src/pages/RecurringPage.tsx`
- Modify: `apps/web/src/pages/SettingsPage.tsx`
- Modify: `apps/web/src/pages/AiAssistantPage.tsx`

- [ ] **Step 1: Replace manual state/fetching in `DashboardPage.tsx`**
- [ ] **Step 2: Replace manual state/fetching in `AccountsPage.tsx`**
- [ ] **Step 3: Replace manual state/fetching in `TransactionsPage.tsx`**
- [ ] **Step 4: Replace manual state/fetching in `TransfersPage.tsx`**
- [ ] **Step 5: Replace manual state/fetching in `CategoriesPage.tsx`**
- [ ] **Step 6: Replace manual state/fetching in `BudgetsPage.tsx`**
- [ ] **Step 7: Replace manual state/fetching in `RecurringPage.tsx`**
- [ ] **Step 8: Replace manual state/fetching in `SettingsPage.tsx`**
- [ ] **Step 9: Replace manual state/fetching in `AiAssistantPage.tsx`**

- [ ] **Step 10: Run frontend tests & TypeScript build check**

Run: `npm run test --prefix apps/web && npx tsc --noEmit --project apps/web/tsconfig.json`

- [ ] **Step 11: Commit page migrations**

```bash
git add apps/web/src/pages/
git commit -m "refactor(web): migrate all pages to TanStack Query hooks"
```

---

### Task 6: Audit, Verification & Documentation Update

**Files:**
- Modify: `docs/frontend-architecture.md`
- Create: `docs/frontend-server-state.md`

- [ ] **Step 1: Perform Security & Non-Persistence Audit**

Search for `localStorage`, `sessionStorage`, `IndexedDB`, `persistQueryClient`, `dangerouslySetInnerHTML`, `OPENAI`. Ensure zero persistence of server state.

- [ ] **Step 2: Run Full Suite Verifications**

Run:
1. `npm run test --prefix apps/web`
2. `npm run test:e2e --prefix apps/web` (Playwright)
3. `npm test -- --runInBand` (Backend unit tests)
4. `npm run test:api:e2e` (Backend E2E tests)
5. `npm run test:api:eval` (AI evaluation test suite)
6. `npm run build:web`
7. `npm run build:api`
8. `npm run lint`
9. `npm run prisma:validate`
10. `npm audit`

- [ ] **Step 3: Update documentation**

Update `docs/frontend-architecture.md` and create `docs/frontend-server-state.md` with:
> "TanStack Query is a performance and UX layer. PostgreSQL through the NestJS API remains the source of truth for financial data."

- [ ] **Step 4: Commit documentation and audit fix**

```bash
git add docs/
git commit -m "docs(web): document TanStack Query server-state architecture and non-persistence security policy"
```
