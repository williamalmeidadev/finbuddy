# FinBuddy Security Architecture & Penetration-Test Readiness Baseline

## 1. Executive Summary

FinBuddy is a financial backend built with NestJS 11, Prisma 7, PostgreSQL 17, and Argon2 password hashing. Given the sensitive nature of user financial records, account balances, transaction histories, and recurring commitments, security controls are implemented at every layer of the architecture.

This document outlines the **threat model**, **implemented security controls**, **automated test verifications**, and **deferred production infrastructure controls**.

---

## 2. Threat Model

### 2.1 Threat Actors & Vectors
We assume an attacker who:
- Can register an account and authenticate normally.
- Obtains their own valid JWT access tokens and refresh tokens.
- Manipulates HTTP parameters, UUIDs, DTO payload fields, and headers.
- Attempts cross-tenant resource access (IDOR / Broken Object-Level Authorization).
- Sends high-volume or concurrent HTTP requests (race conditions, double transfers).
- Submits malformed input, oversized JSON payloads, or injection strings (SQLi, XSS).

We assume the attacker does **NOT** have:
- Production PostgreSQL database credentials.
- Server shell / host system access.
- Production environment secrets (`JWT_SECRET`, system envs).

### 2.2 Critical Assets
1. User Accounts & Profile Data
2. Password Hashes (Argon2)
3. Refresh Tokens & Rotation Hashes (SHA-256)
4. Financial Accounts & Balances
5. Income / Expense Transactions
6. Account-to-Account Transfers
7. Category & Budget Definitions
8. Recurring Transaction Definitions & Execution Logs

---

## 3. Implemented Security Controls

### 3.1 Authentication & Credential Hygiene
- **Argon2 Hashing**: User passwords are hashed using Argon2 with zero plaintext logging or storage.
- **Strict Response Sanitization**: `passwordHash` and `password` fields are never exposed in controller responses or DTO outputs.
- **Refresh Token Rotation**: Refresh tokens are single-use. When refreshed, the current token is revoked and replaced. Token values are stored exclusively as SHA-256 hashes in PostgreSQL (`token_hash`).
- **Fail-Fast Environment Validation**: `JWT_SECRET`, `DATABASE_URL`, and `PORT` are mandatory. The application aborts during startup if any required environment variable is missing (`env.validation.ts`).

### 3.2 Authorization & Broken Object-Level Authorization (IDOR)
- **Database-Level Ownership Filtering**: All queries against `Account`, `Transaction`, `Category`, `Budget`, and `RecurringTransaction` enforce `userId` scoping directly within Prisma `where` clauses (`where: { id, userId }` or `where: { id, account: { userId } }`).
- **Consistent 404 / 403 Errors**: Attempting to read, update, or delete another user's resource returns `404 Not Found` (or `403 Forbidden` for direct user profile access), preventing resource enumeration.

### 3.3 Mass Assignment & Input Validation
- **Global ValidationPipe**: Enforces `whitelist: true` and `forbidNonWhitelisted: true`.
- **DTO Hardening**: System-controlled fields (e.g., `userId`, `balance`, `passwordHash`, `source`, `createdAt`, `updatedAt`) cannot be injected via HTTP request bodies.

### 3.4 Financial Integrity & Invariants
- **Atomic Balance Updates**: Transactions and transfers update account balances within PostgreSQL ACID transactions (`$transaction`).
- **Self-Transfer & Overdraft Checks**: Transfers enforce `fromAccountId !== toAccountId` and verify available balance before execution.
- **Positive Amounts**: Financial mutations enforce positive non-zero amounts.

### 3.5 Security Headers & Web Hardening
- **Helmet Middleware**: Configured globally in NestJS (`main.ts`) to attach security headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `X-XSS-Protection`, etc.).
- **CORS Restrictions**: Configurable via `CORS_ORIGIN` environment variable.

---

## 4. Automated Security Verification Suite

A dedicated regression test suite is maintained at `test/security.e2e-spec.ts`.

| Security Category | Test Scope | Verification Method | Status |
| :--- | :--- | :--- | :--- |
| **Authentication** | JWT Tampering, Password Leakage, Token Rotation | E2E (`test/security.e2e-spec.ts`) | PASS |
| **Authorization / IDOR** | Cross-user GET, PATCH, DELETE on all resources | E2E (`test/security.e2e-spec.ts`) | PASS |
| **Mass Assignment** | Injection of forbidden fields (`userId`, `balance`) | E2E (`test/security.e2e-spec.ts`) | PASS |
| **Financial Integrity** | Balance calculations, Overdrafts, Self-Transfers | E2E (`test/security.e2e-spec.ts`) | PASS |
| **Injection & XSS** | SQLi payloads in queries, XSS script handling | E2E (`test/security.e2e-spec.ts`) | PASS |
| **Security Headers** | Helmet header validation (`nosniff`, `SAMEORIGIN`) | E2E (`test/security.e2e-spec.ts`) | PASS |
| **Tenant Isolation** | Financial Summary multi-tenant calculation | E2E (`test/security.e2e-spec.ts`) | PASS |

---

## 5. Deferred Production Hardening

The following controls belong to the edge/production infrastructure layer and are deferred until cloud deployment:
1. **Reverse Proxy & TLS Termination**: NGINX / Cloudflare for HTTPS and TLS 1.3 enforcement.
2. **Distributed Rate Limiting / WAF**: Redis-backed rate limiting for login/registration endpoints to prevent brute-force attacks.
3. **Secrets Manager**: AWS Secrets Manager / HashiCorp Vault for environment secret injection.
4. **Container Image & Vulnerability Scanning**: Trivy / Snyk scanning in continuous deployment pipelines.
