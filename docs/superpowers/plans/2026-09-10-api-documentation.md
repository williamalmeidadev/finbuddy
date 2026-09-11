# FinBuddy OpenAPI / Swagger Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a production-ready OpenAPI / Swagger documentation layer for all 12 modules and 36 endpoints of the FinBuddy REST API using `@nestjs/swagger`.

**Architecture:** Configure `@nestjs/swagger` in `src/main.ts` exposed at `/docs` (and `/docs-json`). Decorate all DTOs and Controllers with explicit `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiProperty()`, and `@ApiBearerAuth()` metadata while strictly reflecting existing runtime validation and financial precision.

**Tech Stack:** NestJS 11, TypeScript, `@nestjs/swagger`, Express, Jest, Supertest.

---

## Task Inventory & Endpoint Mapping

- **Auth**: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`
- **User**: `POST /users`, `GET /users/:id`
- **Account**: `POST /accounts`, `GET /accounts`, `GET /accounts/:id`, `PATCH /accounts/:id`, `DELETE /accounts/:id`
- **Category**: `POST /categories`, `GET /categories`, `GET /categories/:id`, `PATCH /categories/:id`, `DELETE /categories/:id`
- **Transaction**: `POST /transactions`, `GET /transactions`, `GET /transactions/:id`, `PATCH /transactions/:id`, `DELETE /transactions/:id`
- **Transfer**: `POST /transfers`, `GET /transfers`, `GET /transfers/:id`
- **Budget**: `POST /budgets`, `GET /budgets`, `GET /budgets/:id`, `PATCH /budgets/:id`, `DELETE /budgets/:id`
- **Financial Summary**: `GET /financial-summary`
- **Recurring Transaction**: `POST /recurring-transactions`, `GET /recurring-transactions`, `GET /recurring-transactions/:id`, `PATCH /recurring-transactions/:id`, `DELETE /recurring-transactions/:id`
- **Recurring Transaction Execution**: `POST /recurring-transactions/execute`
- **Health**: `GET /health/live`, `GET /health/ready`
- **App**: `GET /`

---

## Tasks

### Task 1: Package Scaffolding & Swagger Bootstrap in `src/main.ts`

**Files:**
- Modify: `package.json`
- Modify: `src/main.ts`

- [ ] **Step 1: Install `@nestjs/swagger`**
Run `npm install @nestjs/swagger`

- [ ] **Step 2: Add Swagger configuration to `src/main.ts`**
Configure `DocumentBuilder` with title `FinBuddy API`, description, version `0.0.1`, bearer auth format `JWT`, and setup SwaggerModule at `/docs`.

- [ ] **Step 3: Verify build and lint**
Run `npm run build && npm run lint`

- [ ] **Step 4: Commit**
`git commit -m "feat(swagger): add OpenAPI documentation bootstrap"`

---

### Task 2: Document Auth & User Modules

**Files:**
- Modify: `src/auth/dto/login.dto.ts`
- Modify: `src/auth/dto/refresh.dto.ts`
- Modify: `src/auth/dto/authenticated-user.dto.ts`
- Modify: `src/auth/auth.controller.ts`
- Modify: `src/user/dto/create-user.dto.ts`
- Modify: `src/user/dto/user-response.dto.ts`
- Modify: `src/user/user.controller.ts`

- [ ] **Step 1: Decorate Auth & User DTOs with `@ApiProperty()`**
- [ ] **Step 2: Decorate `AuthController` and `UserController` with `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()`**
- [ ] **Step 3: Verify build and lint**
Run `npm run build && npm run lint`
- [ ] **Step 4: Commit**
`git commit -m "feat(swagger): document Auth and User modules"`

---

### Task 3: Document Account & Category Modules

**Files:**
- Modify: `src/account/dto/create-account.dto.ts`
- Modify: `src/account/dto/update-account.dto.ts`
- Modify: `src/account/dto/account-response.dto.ts`
- Modify: `src/account/account.controller.ts`
- Modify: `src/category/dto/create-category.dto.ts`
- Modify: `src/category/dto/update-category.dto.ts`
- Modify: `src/category/dto/category-query.dto.ts`
- Modify: `src/category/dto/category-response.dto.ts`
- Modify: `src/category/category.controller.ts`

- [ ] **Step 1: Decorate Account & Category DTOs with `@ApiProperty()` / `@ApiPropertyOptional()`**
- [ ] **Step 2: Decorate `AccountController` and `CategoryController` with `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()`**
- [ ] **Step 3: Verify build and lint**
Run `npm run build && npm run lint`
- [ ] **Step 4: Commit**
`git commit -m "feat(swagger): document Account and Category modules"`

---

### Task 4: Document Transaction, Transfer & Budget Modules

**Files:**
- Modify: `src/transaction/dto/create-transaction.dto.ts`
- Modify: `src/transaction/dto/update-transaction.dto.ts`
- Modify: `src/transaction/dto/transaction-query.dto.ts`
- Modify: `src/transaction/dto/transaction-response.dto.ts`
- Modify: `src/transaction/transaction.controller.ts`
- Modify: `src/transfer/dto/create-transfer.dto.ts`
- Modify: `src/transfer/dto/transfer-query.dto.ts`
- Modify: `src/transfer/dto/transfer-response.dto.ts`
- Modify: `src/transfer/transfer.controller.ts`
- Modify: `src/budget/dto/create-budget.dto.ts`
- Modify: `src/budget/dto/update-budget.dto.ts`
- Modify: `src/budget/dto/budget-query.dto.ts`
- Modify: `src/budget/dto/budget-response.dto.ts`
- Modify: `src/budget/budget.controller.ts`

- [ ] **Step 1: Decorate Transaction, Transfer & Budget DTOs with `@ApiProperty()` / `@ApiPropertyOptional()`**
- [ ] **Step 2: Decorate Controllers with `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()`**
- [ ] **Step 3: Verify build and lint**
Run `npm run build && npm run lint`
- [ ] **Step 4: Commit**
`git commit -m "feat(swagger): document Transaction, Transfer, and Budget modules"`

---

### Task 5: Document Financial Summary, Recurring Transaction & Execution Modules

**Files:**
- Modify: `src/financial-summary/dto/financial-summary-query.dto.ts`
- Modify: `src/financial-summary/dto/financial-summary-response.dto.ts`
- Modify: `src/financial-summary/financial-summary.controller.ts`
- Modify: `src/recurring-transaction/dto/create-recurring-transaction.dto.ts`
- Modify: `src/recurring-transaction/dto/update-recurring-transaction.dto.ts`
- Modify: `src/recurring-transaction/dto/recurring-transaction-query.dto.ts`
- Modify: `src/recurring-transaction/dto/recurring-transaction-response.dto.ts`
- Modify: `src/recurring-transaction/recurring-transaction.controller.ts`
- Modify: `src/recurring-transaction-execution/dto/execute-recurring-transaction.dto.ts`
- Modify: `src/recurring-transaction-execution/dto/recurring-transaction-execution-response.dto.ts`
- Modify: `src/recurring-transaction-execution/recurring-transaction-execution.controller.ts`

- [ ] **Step 1: Decorate DTOs with `@ApiProperty()` / `@ApiPropertyOptional()`**
- [ ] **Step 2: Decorate Controllers with `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`, `@ApiBearerAuth()`**
- [ ] **Step 3: Verify build and lint**
Run `npm run build && npm run lint`
- [ ] **Step 4: Commit**
`git commit -m "feat(swagger): document Financial Summary and Recurring Transaction modules"`

---

### Task 6: Document Health & App Modules

**Files:**
- Modify: `src/health/health.controller.ts`
- Modify: `src/app.controller.ts`

- [ ] **Step 1: Decorate `HealthController` and `AppController` with OpenAPI decorators**
- [ ] **Step 2: Verify build and lint**
Run `npm run build && npm run lint`
- [ ] **Step 3: Commit**
`git commit -m "feat(swagger): document Health and Root App endpoints"`

---

### Task 7: Create E2E Swagger Test Suite (`test/swagger.e2e-spec.ts`)

**Files:**
- Create: `test/swagger.e2e-spec.ts`

- [ ] **Step 1: Write E2E test verifying GET /docs, GET /docs-json, schema validity, authentication schemes, tags, security filters, and health endpoints**
- [ ] **Step 2: Run `npm run test:e2e`**
- [ ] **Step 3: Commit**
`git commit -m "test(swagger): add OpenAPI regression tests"`

---

### Task 8: Documentation & Full Verification Suite

**Files:**
- Create: `docs/api-documentation.md`

- [ ] **Step 1: Create `docs/api-documentation.md` describing Swagger UI URL, OpenAPI JSON endpoint, authentication instructions, and schema conventions**
- [ ] **Step 2: Run full verification suite (`npm test`, `npm run test:e2e`, `npm run build`, `npm run lint`)**
- [ ] **Step 3: Commit**
`git commit -m "docs(swagger): document API usage"`
