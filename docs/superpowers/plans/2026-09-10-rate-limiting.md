# FinBuddy Rate Limiting & Abuse Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a production-oriented, application-level rate limiting and abuse protection baseline for the FinBuddy REST API using `@nestjs/throttler`. Protect sensitive endpoints against brute-force attacks and request floods while preserving health probes, internal automation, and observability.

**Architecture:** Register `ThrottlerModule` in `src/app.module.ts` configured with environment-backed limits (`default` and `auth` named throttlers). Create a `RateLimitGuard` extending `ThrottlerGuard` to safely resolve client IPs (handling trusted proxies without spoofing vulnerabilities) and combining `userId` + `IP` for authenticated requests. Exclude health check probes via `@SkipThrottle()`. Add HTTP 429 metadata to OpenAPI and verify full behavior with `test/rate-limit.e2e-spec.ts`.

**Tech Stack:** NestJS 11, `@nestjs/throttler@^6`, TypeScript, Express, Jest, Supertest.

---

## Tasks

### Task 1: Scaffolding `@nestjs/throttler` & Environment Configuration

**Files:**
- Modify: `package.json`
- Modify: `src/config/env.validation.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install `@nestjs/throttler`**
Run `npm install @nestjs/throttler@^6`

- [ ] **Step 2: Add rate limiting environment validation variables**
Add `THROTTLE_TTL` (default: 60000), `THROTTLE_LIMIT` (default: 100), and `THROTTLE_AUTH_LIMIT` (default: 10) to `src/config/env.validation.ts` and `.env.example`.

- [ ] **Step 3: Verify build and lint**
Run `npm run build && npm run lint`

- [ ] **Step 4: Commit**
`git commit -m "feat(rate-limit): add throttler dependencies and environment configuration"`

---

### Task 2: Implement Custom `RateLimitGuard` (Proxy & User/IP Keying)

**Files:**
- Create: `src/common/guards/rate-limit.guard.ts`
- Create: `src/common/guards/rate-limit.guard.spec.ts`

- [ ] **Step 1: Write unit test for `RateLimitGuard`**
Test `getTracker(req)` for unauthenticated requests (client IP extraction), authenticated requests (`userId:clientIP`), and IP header sanitization.

- [ ] **Step 2: Implement `RateLimitGuard`**
Extend `ThrottlerGuard` in `src/common/guards/rate-limit.guard.ts`. Implement `getTracker(req)` to safely extract client IP without spoofing risks and append `userId` when authenticated.

- [ ] **Step 3: Run unit tests, build, and lint**
Run `npm test && npm run build && npm run lint`

- [ ] **Step 4: Commit**
`git commit -m "feat(rate-limit): add safe RateLimitGuard with proxy and user/IP keying"`

---

### Task 3: Global Throttler Bootstrap & Module Integration

**Files:**
- Modify: `src/app.module.ts`

- [ ] **Step 1: Configure `ThrottlerModule.forRootAsync` in `src/app.module.ts`**
Import `ThrottlerModule` and configure `default` (TTL 60s, limit 100) and `auth` (TTL 60s, limit 10) limiters. Register `RateLimitGuard` as global `APP_GUARD`.

- [ ] **Step 2: Verify build and lint**
Run `npm run build && npm run lint`

- [ ] **Step 3: Commit**
`git commit -m "feat(rate-limit): register ThrottlerModule and global guard in AppModule"`

---

### Task 4: Protect Sensitive Endpoints & Exclude Health Checks

**Files:**
- Modify: `src/auth/auth.controller.ts`
- Modify: `src/health/health.controller.ts`

- [ ] **Step 1: Decorate `AuthController` sensitive routes (`login`, `refresh`) with `@Throttle({ auth: { ttl: 60000, limit: 10 } })`**
- [ ] **Step 2: Decorate `HealthController` with `@SkipThrottle()`**
- [ ] **Step 3: Verify build and lint**
Run `npm run build && npm run lint`

- [ ] **Step 4: Commit**
`git commit -m "feat(rate-limit): apply auth endpoint throttling and skip health checks"`

---

### Task 5: Document 429 Responses in OpenAPI & Controllers

**Files:**
- Modify: `src/auth/auth.controller.ts`
- Modify: `src/user/user.controller.ts`
- Modify: `src/account/account.controller.ts`
- Modify: `src/category/category.controller.ts`
- Modify: `src/transaction/transaction.controller.ts`
- Modify: `src/transfer/transfer.controller.ts`
- Modify: `src/budget/budget.controller.ts`
- Modify: `src/financial-summary/financial-summary.controller.ts`
- Modify: `src/recurring-transaction/recurring-transaction.controller.ts`
- Modify: `src/recurring-transaction-execution/recurring-transaction-execution.controller.ts`

- [ ] **Step 1: Add `@ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })` to controllers**
- [ ] **Step 2: Verify build and lint**
Run `npm run build && npm run lint`

- [ ] **Step 3: Commit**
`git commit -m "feat(rate-limit): document 429 response status in OpenAPI controllers"`

---

### Task 6: Create Rate Limiting & Abuse Protection E2E Test Suite (`test/rate-limit.e2e-spec.ts`)

**Files:**
- Create: `test/rate-limit.e2e-spec.ts`

- [ ] **Step 1: Write `test/rate-limit.e2e-spec.ts`**
Test:
1. Normal requests below limit succeed.
2. Exceeding limit returns 429 with `X-Request-Id` preserved and sanitized JSON error shape.
3. Auth endpoints trigger 429 on tighter threshold (e.g. 10 requests).
4. Health endpoints (`/health/live`, `/health/ready`) bypass rate limiting.
5. User/IP key isolation works (different IP or user gets separate bucket).
6. Security header spoofing (e.g. rotating fake `X-Forwarded-For` without trusted proxy setting) does not bypass limit.

- [ ] **Step 2: Run `npx jest --config ./test/jest-e2e.json test/rate-limit.e2e-spec.ts`**

- [ ] **Step 3: Commit**
`git commit -m "test(rate-limit): add rate limiting and abuse protection e2e regression suite"`

---

### Task 7: Comprehensive Documentation & Final Baseline Verification

**Files:**
- Create: `docs/rate-limiting.md`

- [ ] **Step 1: Create `docs/rate-limiting.md`**
Document purpose, global vs auth limits, 429 behavior, user/IP keying, proxy security, environment variables, in-memory limitations, and future Redis architectural transition.

- [ ] **Step 2: Run full verification suite**
Run `npm test`, `npm run test:e2e`, `npm run build`, `npm run lint`.

- [ ] **Step 3: Commit**
`git commit -m "docs(rate-limit): document rate limiting architecture and configuration"`
