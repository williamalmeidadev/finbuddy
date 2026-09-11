# FinBuddy REST API OpenAPI / Swagger Documentation

## 1. Overview
The FinBuddy REST API is documented using the official `@nestjs/swagger` integration. The OpenAPI specification provides a complete, machine-readable contract for frontend developers, API clients, and integration tooling.

---

## 2. Interactive Swagger UI & OpenAPI Specification

- **Swagger UI Interactive Documentation**: `http://localhost:3000/docs`
- **OpenAPI 3.0 JSON Specification**: `http://localhost:3000/docs-json`

---

## 3. Module Tag Organization

The API endpoints are grouped into 10 primary tags:

| Tag | Description | Key Routes |
|---|---|---|
| `Health` | Liveness and readiness system health checks | `GET /health/live`, `GET /health/ready`, `GET /` |
| `Auth` | Authentication, JWT login, token rotation, and profile | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| `Users` | User account profile management | `POST /users`, `GET /users/:id` |
| `Accounts` | Financial account management | `POST /accounts`, `GET /accounts`, `GET /accounts/:id`, `PATCH /accounts/:id`, `DELETE /accounts/:id` |
| `Categories` | Income and expense transaction categories | `POST /categories`, `GET /categories`, `GET /categories/:id`, `PATCH /categories/:id`, `DELETE /categories/:id` |
| `Transactions` | Financial transaction ledger | `POST /transactions`, `GET /transactions`, `GET /transactions/:id`, `PATCH /transactions/:id`, `DELETE /transactions/:id` |
| `Transfers` | Account-to-account funds transfers | `POST /transfers`, `GET /transfers`, `GET /transfers/:id` |
| `Budgets` | Monthly category spending budget targets | `POST /budgets`, `GET /budgets`, `GET /budgets/:id`, `PATCH /budgets/:id`, `DELETE /budgets/:id` |
| `Financial Summary` | Aggregated monthly financial summary reports | `GET /financial-summary` |
| `Recurring Transactions` | Scheduled recurring transaction rules and batch execution | `POST /recurring-transactions`, `GET /recurring-transactions`, `GET /recurring-transactions/:id`, `PATCH /recurring-transactions/:id`, `DELETE /recurring-transactions/:id`, `POST /recurring-transactions/execute` |

---

## 4. Authentication Usage in Swagger UI

Protected endpoints require a valid JWT Bearer access token:

1. Send a request to `POST /auth/login` with your credentials.
2. Copy the returned `accessToken`.
3. In Swagger UI (`/docs`), click the **Authorize** button at the top right.
4. Enter your token into the `JWT-auth` input box.
5. Click **Authorize** to send `Authorization: Bearer <access-token>` headers automatically.

---

## 5. Financial Representation Conventions

- **Monetary Amounts (`amount`, `balance`, `spent`, `remaining`)**: Serialized in JSON responses as standard numbers (`number`), converting Prisma `Decimal` values via `.toNumber()`.
- **Dates & Dates-only**:
  - Full timestamps (`createdAt`, `transactionAt`): Serialized as ISO 8601 strings (`YYYY-MM-DDTHH:mm:ss.sssZ`).
  - Dates (`startDate`, `nextOccurrence`, `endDate`): Serialized as `YYYY-MM-DD` strings.
  - Months (`month`): Serialized as `YYYY-MM` or `YYYY-MM-01` strings.

---

## 6. Correlation Header (`X-Request-Id`)

All API responses support request tracing via `X-Request-Id`. You may optionally pass a custom `X-Request-Id` header (alphanumeric up to 64 chars) to correlate client requests with backend log entries.

---

## 7. Security & Confidentiality Safeguards

The OpenAPI document builder does not expose sensitive server environment variables, secrets, JWT signing keys, database connection strings, or actual user credentials. All example payloads use generic safe placeholder values.
