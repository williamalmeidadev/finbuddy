# FinBuddy

Production-Grade Personal Finance Platform and AI Financial Assistant Engine

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-5FA04E?style=for-the-badge&logo=nodedotjs&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI_GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger_OpenAPI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
![JWT](https://img.shields.io/badge/JWT_Auth-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)

FinBuddy is an enterprise-grade full-stack personal finance platform and intelligent financial assistant engine. Built with an architecture designed for high precision, security, and scalability, FinBuddy combines robust account and budget tracking with a deterministic, security-hardened AI Agent automation system powered by OpenAI.

---

## Technical Stack

### Backend & API Architecture
![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger_OpenAPI_3.0-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)
![JWT](https://img.shields.io/badge/JWT_Authentication-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)

- NestJS 11: Modular backend service framework utilizing dependency injection and layered architecture.
- TypeScript 5.7+: Enforces end-to-end static typing and domain integrity.
- Passport.js & JWT: Secure authentication flow using signed JWT tokens and HTTP-only refresh tokens.
- Argon2: Industry-standard password hashing algorithm.
- Class Validator & Transformer: DTO validation and input sanitization on incoming network requests.
- Helmet & Throttler: Security headers protection and rate-limiting middleware.

### Frontend Application
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite_6-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router_7-CA4245?style=for-the-badge&logo=reactrouter&logoColor=white)
![TanStack Query](https://img.shields.io/badge/TanStack_Query_v5-FF4154?style=for-the-badge&logo=reactquery&logoColor=white)

- React 19: Modern declarative UI engine using function components and custom hooks.
- Vite 6: Next-generation fast frontend build tool and development server.
- Tailwind CSS v4: Utility-first CSS styling framework.
- React Router 7: Client-side routing solution with type-safe layout management.
- TanStack Query v5: Asynchronous server state management, caching, and optimistic UI updates.
- Lucide React & HugeIcons: Comprehensive iconography libraries.
- Recharts: Interactive financial data visualizations and analytics reporting.

### Database & ORM
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_6-2D3748?style=for-the-badge&logo=prisma&logoColor=white)

- PostgreSQL 17: Relational database system running on Alpine Linux images.
- Prisma ORM 6: Type-safe database client, schema management, and automated migration runner.

### AI Engine & Automation
![OpenAI](https://img.shields.io/badge/OpenAI_Responses_API-412991?style=for-the-badge&logo=openai&logoColor=white)

- OpenAI Responses API: Direct integration using official `@openai/api` SDK (zero third-party wrapper overhead).
- Dynamic Tool Calling: Real-time execution of financial read and write functions with schema validation.
- Long-Term Memory Store: User-scoped contextual memory (`PREFERENCE`, `FINANCIAL_GOAL`, `GENERAL_CONTEXT`).
- Human-in-the-Loop Confirmation: Two-step transaction execution mechanism requiring user consent for destructive write operations.
- Security Audit Trail: Comprehensive logging of AI events, risk levels, and tool executions.

### Testing & Infrastructure
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

- Docker & Docker Compose: Containerized production API and containerized database services.
- Jest: Unit, integration, and AI deterministic evaluation suite runner.
- Vitest: Lightning-fast unit testing framework for frontend components.
- Playwright: End-to-end browser testing engine across desktop and mobile viewports.
- GitHub Actions: Automated CI quality gate pipelines enforcing linting, build checks, and test suites.

---

## Core Features

- Account Management: Support for multiple account categories (Checking, Savings, Credit Card, Investment, Cash) with real-time balance aggregation.
- Transaction & Transfer Ledger: Record income, expense, and inter-account transfer transactions with strict validation rules.
- Budgeting Engine: Monthly category budget allocations with percentage tracking and threshold alerts.
- Recurring Transactions: Automated scheduling and processing of recurring bills and regular income.
- AI Financial Assistant: Interactive assistant that accepts natural language requests to query analytics, log transactions, set budgets, and extract financial insights.
- Two-Step Write Confirmation: High-risk actions (such as transfers or record deletions) generate pending confirmation requests that require explicit user approval.
- AI Evaluation Suite: 403 deterministic evaluation scenarios verifying prompt injection resiliency, function selection accuracy, parameter validation, and user tenant boundaries.

---

## Architecture Overview

FinBuddy operates as an NPM Monorepo housing the backend API service, frontend web client, and shared TypeScript configurations.

```mermaid
graph TD
    Client["Web Client (Vite + React 19)"]
    API["NestJS 11 Backend API"]
    Guard["JwtAuthGuard & Throttler"]
    Orchestrator["AI Agent Orchestrator"]
    Validator["Tool Argument Validator"]
    AuthService["Tool Authorization Service"]
    Tools["Tool Registry"]
    Services["Financial Core Services"]
    Prisma["Prisma ORM 6"]
    DB[("PostgreSQL 17 DB")]
    OpenAI["OpenAI Responses API"]

    Client -->|HTTPS / REST API| Guard
    Guard --> API
    API --> Services
    API --> Orchestrator
    Orchestrator <-->|Responses API| OpenAI
    Orchestrator --> Validator
    Validator --> AuthService
    AuthService --> Tools
    Tools --> Services
    Services --> Prisma
    Prisma --> DB
```

### Monorepo Structure

```text
finbuddy/
├── apps/
│   ├── api/                      # NestJS 11 Backend API Service & AI Agent
│   │   ├── prisma/               # Prisma Database Schema & Migrations
│   │   ├── src/                  # Controllers, Services, Modules & AI Engine
│   │   └── test/                 # E2E Integration & AI Agent Evaluation Suite
│   └── web/                      # Vite 6 + React 19 Frontend Web Application
│       ├── src/                  # React Components, Hooks, Router & State
│       └── tests/                # Playwright E2E & Vitest Unit Tests
├── docs/                         # Comprehensive Technical Architecture & Security Guides
├── .github/workflows/ci.yml      # CI/CD Quality Gate Pipeline
├── docker-compose.yml            # Docker Container Orchestration
├── Dockerfile                    # Containerization Build File
├── package.json                  # Monorepo Workspace Configuration
└── tsconfig.base.json            # Shared TypeScript Base Configuration
```

---

## Getting Started

### Prerequisites

- Node.js: v24.0.0 or higher
- npm: v10.0.0 or higher
- Docker & Docker Compose (for containerized PostgreSQL and API deployment)
- PostgreSQL: v17 (if running outside Docker)

### Installation & Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/finbuddy.git
   cd finbuddy
   ```

2. Copy environment files:
   ```bash
   cp .env.example .env
   ```

3. Configure environment variables in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finbuddy?schema=public"
   DATABASE_URL_DOCKER="postgresql://postgres:postgres@postgres:5432/finbuddy"
   JWT_SECRET="your-secure-jwt-secret-key"
   JWT_EXPIRES_IN="15m"
   REFRESH_TOKEN_EXPIRES_IN="7d"
   PORT=3000
   NODE_ENV="development"
   CORS_ORIGIN="http://localhost:3003"
   OPENAI_API_KEY="your-openai-api-key"
   OPENAI_MODEL="gpt-4o-mini"
   DISABLE_RATE_LIMIT="false"
   SWAGGER_ENABLED="true"
   ```

4. Install workspace dependencies:
   ```bash
   npm install
   ```

5. Generate Prisma client & apply database migrations:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

### Development Execution

Run backend API service in development mode:
```bash
npm run start:dev --workspace=@finbuddy/api
```

Run frontend web application in development mode:
```bash
npm run dev --workspace=@finbuddy/web
```

### Docker Compose Execution

To build and launch the complete stack using Docker Compose:
```bash
docker-compose up --build -d
```

The services will be accessible at:
- Backend API & Swagger: `http://localhost:3000`
- API Health Status: `http://localhost:3000/health/ready`
- Frontend Web App: `http://localhost:3003`

---

## Quality Assurance & Verification

FinBuddy incorporates automated verification suites across unit, integration, browser E2E, and AI agent performance levels.

| Script Command | Target Workspace | Description |
|---|---|---|
| `npm run test` | All Workspaces | Executes unit test suites across all packages. |
| `npm run test:api` | `@finbuddy/api` | Runs backend Jest unit tests. |
| `npm run test:api:e2e` | `@finbuddy/api` | Runs backend E2E integration test suites (18 suites, 226 tests). |
| `npm run test:api:eval` | `@finbuddy/api` | Executes AI Agent deterministic evaluation suite (403 scenarios). |
| `npm run test:web` | `@finbuddy/web` | Runs frontend unit tests via Vitest. |
| `npm run test:web:e2e` | `@finbuddy/web` | Executes Playwright end-to-end browser test suites. |
| `npm run lint` | All Workspaces | Validates ESLint rules across TypeScript codebases. |
| `npm run build` | All Workspaces | Compiles TypeScript production builds for all apps. |

---

## API Documentation & Endpoints

When the API service is running with `SWAGGER_ENABLED=true`, access the Swagger OpenAPI 3.0 interactive documentation interface at:
`http://localhost:3000/api/docs`

### Major Endpoint Groups

- Authentication (`/auth`): Registration, login, token refresh, logout, profile management.
- Financial Accounts (`/accounts`): CRUD operations for bank accounts, credit cards, investments, and balances.
- Transactions (`/transactions`): Filterable transaction history, ledger creation, updates, and category tagging.
- Transfers (`/transfers`): Inter-account fund transfer processing with balance integrity guarantees.
- Budgets (`/budgets`): Category-specific monthly budget allocation and spending progress tracking.
- Categories (`/categories`): Custom category definitions with iconography and visual color coding.
- AI Agent (`/ai-agent`): Natural language interaction endpoint (`/messages`), confirmation execution (`/confirmations`), conversation history (`/conversations`), and agent memory management (`/memories`).
- Health & Metrics (`/health`): Readiness and liveness probes powered by NestJS Terminus.

---

## Technical Documentation Index

For in-depth explanations of architecture, security policies, database design, and AI agent mechanisms, refer to the documents in the `docs/` directory:

- [AI Agent Architecture](docs/ai-agent.md): Core philosophy, Response API integration, tool execution loop, and component breakdown.
- [AI Agent Security & Guardrails](docs/ai-agent-security.md): Prompt injection defense, tenant boundaries, argument validation, authorization matrix.
- [AI Agent Write Tools & Confirmation](docs/ai-agent-write-tools.md): Two-step confirmation flow, write tool specs, TTL management.
- [AI Agent Memory Architecture](docs/ai-agent-memory.md): Long-term memory storage, contextual injection, memory lifecycle rules.
- [AI Agent Observability](docs/ai-agent-observability.md): Metrics, audit event logging, evaluation scoring, request trace IDs.
- [AI Agent Evaluation Suite](docs/ai-agent-evaluation.md): 403-scenario test harness, assertion runner, evaluation suites breakdown.
- [AI Agent Conversation Management](docs/ai-agent-conversations.md): Multi-turn conversation persistence, context pruning, message sequencing.
- [Database Performance & Schema](docs/database-performance.md): PostgreSQL 17 indexing strategies, schema definitions, Decimal precision handling.
- [Frontend Architecture](docs/frontend-architecture.md): React 19 setup, state management with TanStack Query, routing, layout structure.
- [Frontend Server State](docs/frontend-server-state.md): Server state caching, optimistic UI patterns, cache invalidation rules.
- [Fullstack Security Matrix](docs/fullstack-security.md): Authentication tokens, CORS, CSRF defenses, input sanitization policies.
- [Deployment & Operations Guide](docs/deployment.md): Docker configurations, production setup, environment configurations, backup recovery routines.

---

## License

This repository is private and proprietary. All rights reserved.
