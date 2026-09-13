# FinBuddy Frontend Architecture & Design System Documentation (Phase 20)

## 1. Executive Summary

Phase 20 establishes the clean monorepo architecture (`apps/api`, `apps/web`) and production-quality Next.js 15 frontend foundation for the FinBuddy personal financial management web application.

The frontend foundation is built with:
- **Framework**: Next.js 15 (App Router, Server Components)
- **Styling**: Tailwind CSS & CSS Variables with custom semantic design tokens
- **Component Foundation**: shadcn/ui (Radix-inspired accessible primitive components)
- **Icons**: Lucide React
- **Theme Support**: `next-themes` (Light mode, Dark mode, System preference)
- **API Boundary**: Centralized fetch wrapper (`apiClient`) with normalized error handling (`ApiError`)
- **Authentication Boundary**: Token storage interface (`tokenStorage`), `AuthProvider`, and `useAuth` hook

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
│   └── web/                  # Next.js 15 Web Application
│       ├── app/              # App Router Pages & Layouts
│       ├── components/       # UI, Layout, Theme, Financial, & AI Components
│       ├── lib/              # Utils, Formatters, API Client, Auth Strategy
│       ├── hooks/            # Custom Hooks (useAuth)
│       └── __tests__/        # Frontend Unit & Component Tests
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
