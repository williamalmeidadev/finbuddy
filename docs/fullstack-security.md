# FinBuddy Full-Stack Security Architecture & Validation

This document outlines the security controls, validation strategies, threat models, and edge case handling across the FinBuddy web application and backend API services.

---

## 1. Authentication & Session Refresh Controls

### 1.1 Refresh-Token Rotation & HTTP-Only Cookies
- **Tokens**: Access tokens are short-lived JWTs (15m expiry). Refresh tokens are long-lived (7d expiry) stored in HTTP-Only, SameSite, Secure cookies.
- **Rotation**: Every refresh invocation revokes the old refresh token, generating a new token pair to prevent replay attacks.
- **Client Transparency**: The frontend API client interceptor (`apps/web/lib/api-client.ts`) detects `401 Unauthorized` responses and automatically triggers `/auth/refresh` before retrying the original request transparently.
- **Invalidation**: User logout invalidates active refresh tokens server-side and clears authentication cookies.

---

## 2. Authorization & Tenant Isolation (IDOR Shielding)

### 2.1 Ownership-Aware Repositories
- All financial queries (Accounts, Transactions, Transfers, Categories, Budgets, Recurring Rules) enforce `userId` scoping at the database query layer (`Prisma.where({ id, userId })`).
- Attempts by User A to read, update, or delete User B's resources result in standard `404 Not Found` or `403 Forbidden` responses without leaking resource existence.

---

## 3. Web & API Security Controls

### 3.1 Defense-in-Depth Measures
- **XSS Protection**: React automatic HTML entity escaping combined with server-side validation/sanitization prevents injection via script tags (`<script>`, `<img onerror=...>`, `javascript:`).
- **Open Redirect Guard**: Login redirect parameters are validated against strict relative path checks (`/^\/[^\/\\]/`). External URIs and protocol-relative links (e.g. `//malicious.com`) fall back to default dashboard routes (`/app/dashboard`).
- **HTTP Security Headers & CORS**: Helmet configures `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection`, and Strict Transport Security (`HSTS`). CORS is constrained to whitelisted origin headers.
- **Error Leakage Prevention**: Production environment errors suppress stack traces, Prisma internal query structures, and database schema details, returning sanitized standard RFC 7807 error structures.

---

## 4. Financial Invariants & Edge Cases

### 4.1 Double-Entry Atomic Balances
- **Balance Preservation**: Financial transactions dynamically update account balances within Prisma transaction blocks.
- **Transfer Deletion Edge Case**: Deleting Transfer $A \rightarrow B$ atomically increments source account $A$'s balance by $N$ and decrements target account $B$'s balance by $N$. If account $B$ has already spent those funds, $B$'s balance correctly reflects a negative position (e.g. -\$500.00). This behavior preserves double-entry accounting integrity and prevents unbacked money creation.
