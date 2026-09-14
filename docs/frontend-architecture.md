# FinBuddy Frontend Architecture & Design System Documentation (Phase 21)

## 1. Executive Summary

Phase 20 established the monorepo foundation, and Phase 21 delivers the complete functional Web Application UI connected to the production-hardened NestJS API backend.

The frontend includes:
- **Framework**: Vite 6 + React 19 (React Router 7, Client-Side Application)
- **Styling**: Tailwind CSS v4 & CSS Variables with custom semantic design tokens
- **Component Foundation**: Lucide React & Tailwind-styled UI primitives
- **Icons**: Lucide React
- **API Transport**: Centralized `client.ts` fetch wrapper with dynamic `VITE_API_URL` resolution, automatic 401 token refresh retry queuing, subscriber deduplication, and loop protection
- **Authentication**: In-memory token management, `AuthProvider` (`auth-context.tsx`), `useAuth` hook, and protected `/app/*` (`AuthGuard` / `ProtectedRoute`)
- **Financial Product Views**:
  - **Dashboard**: Net worth summary, monthly income/expense/savings breakdown, connected account grid, recent ledger entries, category budget health indicators, and quick action modals.
  - **Accounts**: Multi-account ledger overview (Checking, Savings, Credit Card, Investment, Cash), account creation modal, inline edit, and deactivation.
  - **Transactions**: Paginated ledger view, multi-attribute filters (Search, Account, Category, Type), income/expense entry modal, edit/delete modals. Immutability locks enforced on SYSTEM & Transfer-linked records.
  - **Transfers**: Inter-account atomic transfers, source/target flow presentation, edit modal, and balance-reversal delete confirmation modal.
  - **Categories**: Income & Expense classification manager, color accent selector, icon assignment, system category protection.
  - **Budgets**: Category spending limit monitor, month/year selector, visual progress bars with health badges (`Healthy` <= 80%, `Warning` > 80% <= 100%, `Exceeded` > 100%).
  - **Recurring Transactions**: Subscriptions & scheduled automated entries, frequency controls (Daily, Weekly, Monthly, Yearly), active/paused status toggles.
  - **Settings**: Authenticated user profile summary, role display, and API security status.

---

## 2. Monorepo Architecture

The repository is structured as an npm workspace monorepo:

```text
finbuddy/
├── apps/
│   ├── api/                  # NestJS 11 Backend API Service
│   │   ├── src/              # Financial Domain Services, Controllers, AI Agent
│   │   ├── prisma/           # Prisma 7 Schema & PostgreSQL 17 Migrations
│   │   └── test/             # Unit, E2E, & 403 AI Deterministic Evaluation Suites
│   │
│   └── web/                  # Vite 6 + React 19 Web Application
│       ├── src/              # React Pages, Components, Services, & Auth Context
│       │   ├── components/   # UI, Layout, Financial, & AI Assistant Components
│       │   ├── lib/          # Utils, Formatters, API Client, Services & Auth Context
│       │   └── pages/        # Route Pages (Dashboard, Accounts, Transactions, etc.)
│       ├── e2e/              # Playwright Browser E2E Test Suite (42 tests)
│       ├── src/__tests__/    # Vitest Unit & Integration Tests
│       └── vite.config.ts    # Vite Configuration
│
├── docs/                     # Architecture & Domain Documentation
├── .github/workflows/ci.yml  # GitHub Actions Quality Gates
├── package.json              # Root npm Workspaces Manifest
├── tsconfig.base.json        # Shared TypeScript Base Configuration
└── README.md
```

---

## 3. Design System & Semantic Tokens

FinBuddy enforces an information-dense, financial-focused design system. Excessive glassmorphism, decorative gradients, and visual clutter are prohibited.

### 3.1 Color Palette & Semantic Financial Tokens

| Token | Light Mode Value | Dark Mode Value | Usage |
|---|---|---|---|
| `--background` | `hsl(210 40% 98%)` | `hsl(222 47% 7%)` | App Shell background surface |
| `--card` | `hsl(0 0% 100%)` | `hsl(222 47% 11%)` | Card surfaces |
| `--primary` | `hsl(221 83% 53%)` | `hsl(217.2 91.2% 59.8%)` | Primary action buttons and highlights |
| `--financial-positive` | `hsl(160 84% 39%)` | `hsl(158 64% 45%)` | Income, positive cash flow, confirmed state |
| `--financial-negative` | `hsl(343 87% 56%)` | `hsl(345 82% 62%)` | Expenses, debt, negative balance |
| `--financial-warning` | `hsl(38 92% 50%)` | `hsl(38 92% 50%)` | Pending confirmation, alerts |

---

## 4. App Shell & Layout Hierarchy

```text
┌─────────────────────────────────────────────────────────────┐
│ Header (Page Title, Mobile Nav Trigger, User Avatar)        │
├──────────────┬──────────────────────────────────────────────┤
│ Sidebar      │ Main Content Area                            │
│ (Desktop     │                                              │
│ Persistent)  │ - /app/dashboard                             │
│              │ - /app/accounts                              │
│              │ - /app/transactions                          │
│              │ - /app/transfers                             │
│              │ - /app/budgets                               │
│              │ - /app/categories                            │
│              │ - /app/recurring                             │
│              │ - /app/ai                                    │
│              │ - /app/settings                              │
└──────────────┴──────────────────────────────────────────────┘
```

On mobile screens (`< 768px`), the sidebar collapses into a responsive `Sheet` drawer accessible via the menu icon in the header.

---

## 5. Security & Auth Boundary

- **Untrusted Frontend**: The browser is treated as untrusted. No database connection string, JWT secret, or `OPENAI_API_KEY` is present in `apps/web`.
- **API Transport**: HTTP requests flow from browser → Next.js / NestJS API → PostgreSQL / OpenAI.
- **Client Client-Side Storage**: Access tokens are held in-memory with local fallback (`tokenStorage`). Refresh tokens utilize HTTP-only cookies.
- **Error Protection**: API errors are caught by `ApiError.fromResponse`, stripping database tracebacks and upstream OpenAI messages.

---

## 6. Monorepo Scripts

```bash
# Build all workspaces
npm run build

# Run unit tests across workspaces
npm run test

# Run backend AI evaluation suite (403 scenarios)
npm run test:api:eval

# Run backend E2E integration tests
npm run test:api:e2e

# Run frontend tests
npm run test:web

# Validate Prisma schema
npm run prisma:validate
```
