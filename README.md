# FinBuddy — Personal Financial Management & AI Assistant

FinBuddy is a production-grade, full-stack personal finance application with a Vite + React web application, NestJS 11 backend API, PostgreSQL 17 database, and a production-hardened AI Agent automation engine.

## 1. Monorepo Architecture

```text
finbuddy/
├── apps/
│   ├── api/                  # NestJS 11 Backend API Service & AI Agent
│   └── web/                  # Vite 6 + React 19 Web Application (React Router 7, Tailwind v4, Lucide)
├── docs/                     # Full Technical & AI Architecture Documentation
├── .github/workflows/ci.yml  # GitHub Actions Quality Gates
├── package.json              # Monorepo Workspace Configuration
└── tsconfig.base.json        # Shared TypeScript Base Config
```

## 2. Quick Start & Development

```bash
# 1. Install dependencies across all workspaces
$ npm install

# 2. Generate Prisma Client
$ npm run prisma:generate

# 3. Validate Prisma Schema
$ npm run prisma:validate

# 4. Run Backend Development Server
$ npm run start:dev --workspace=@finbuddy/api

# 5. Run Frontend Development Server
$ npm run dev --workspace=@finbuddy/web
```

## 3. Verification & Quality Gates

```bash
# Run unit tests across all workspaces
$ npm run test

# Run AI Deterministic Evaluation Suite (403 scenarios)
$ npm run test:api:eval

# Run Backend E2E Integration Tests (18 suites, 226 tests)
$ npm run test:api:e2e

# Run Frontend Tests
$ npm run test:web

# Run Linter across workspaces
$ npm run lint

# Build all workspaces for production
$ npm run build
```
