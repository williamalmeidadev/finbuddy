# FinBuddy Browser E2E Testing Architecture & Suite Specification

This document details the Playwright browser End-to-End (E2E) testing infrastructure, configuration, coverage, and execution instructions for FinBuddy.

---

## 1. Overview & Setup

### 1.1 Infrastructure
- **Framework**: Playwright (`@playwright/test` v1.63.0) with Chromium browser engine.
- **Config**: Located at `apps/web/playwright.config.ts`. Automatically manages background NestJS API server (Port 3002) and Next.js Web App (Port 3003).

### 1.2 Execution Commands
```bash
# Run full browser E2E test suite
npm run test:web:e2e

# Run tests with UI inspector
npx playwright test --ui --config=apps/web/playwright.config.ts
```

---

## 2. Test Suite Modules (`apps/web/e2e/`)

| Module | Location | Description |
| :--- | :--- | :--- |
| **Registration** | `e2e/auth/registration.spec.ts` | Valid registration, duplicate email handling, validation rules. |
| **Login** | `e2e/auth/login.spec.ts` | Credentials verification, invalid login messages, authenticated redirects. |
| **Logout** | `e2e/auth/logout.spec.ts` | Session termination, cookie clearance, protected route denial. |
| **Protected Routes** | `e2e/auth/protected-routes.spec.ts` | Complete verification across all 10 `/app/*` application routes. |
| **Session Refresh** | `e2e/auth/session-refresh.spec.ts` | Transparent access token renewal and expired session behavior. |
| **IDOR Isolation** | `e2e/security/idor.spec.ts` | Cross-user data isolation (User A vs User B). |
| **XSS Shielding** | `e2e/security/xss.spec.ts` | Input sanitization for script tags, onerror payloads, and JavaScript links. |
| **Open Redirect** | `e2e/security/open-redirect.spec.ts` | Malicious redirect parameter fallback to `/app/dashboard`. |
| **Security Headers & CORS**| `e2e/security/security-headers-cors.spec.ts` | Helmet headers (`X-Frame-Options`, `X-Content-Type-Options`) & CORS origin policy. |
| **Error Leakage** | `e2e/security/error-leakage.spec.ts` | Suppression of stack traces, Prisma errors, and database structures. |
| **Accounts** | `e2e/accounts/accounts.spec.ts` | Account creation, update, and deactivation lifecycle. |
| **Transactions** | `e2e/transactions/transactions.spec.ts` | Deposit/Expense entries and automated balance adjustments. |
| **Transfers** | `e2e/transfers/transfers.spec.ts` | Inter-account transfers and balance reversal edge cases. |
| **Categories** | `e2e/categories/categories.spec.ts` | Custom category management and transaction tagging. |
| **Budgets** | `e2e/budgets/budgets.spec.ts` | Budget target limits and spent amount tracking. |
| **Recurring** | `e2e/recurring/recurring.spec.ts` | Recurring transaction rules scheduling. |
| **Dashboard** | `e2e/dashboard/dashboard.spec.ts` | Overview summary metrics presentation. |
| **Accessibility & Viewports**| `e2e/accessibility/accessibility-responsive.spec.ts` | WCAG accessibility attributes & Desktop (1280x800), Tablet (768x1024), Mobile (375x667) responsiveness. |
