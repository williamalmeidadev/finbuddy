# FinBuddy AI Agent — Financial Write Tools & Human Confirmation Architecture

## 1. Executive Summary & Security Philosophy

Phase 13 introduces FinBuddy's first AI-controlled financial write tool: `create_transaction`.

Because financial mutations carry inherent risk (unintended charges, duplicated records, erroneous amounts), FinBuddy enforces a strict **Human-in-the-Loop Confirmation Policy** for all financial mutations.

### Core Security Invariants

```text
LLM output → UNTRUSTED → Argument Validation → Tool Authorization → Risk Assessment → Confirmation Check → Pending State → Human Confirmation → Domain Execution → Database
```

1. **Zero Direct LLM Inline Database Financial Mutations**:
   - The LLM can propose financial transaction creation, but **cannot execute database writes inline** during the conversational tool loop for financial mutations.
   - When a financial write tool (`create_transaction`, `requiresConfirmation = true`) is selected by the model, the orchestrator intercepts execution, validates arguments, checks authorization, and creates a pending `AiConfirmation` entity.
   - Non-financial, low-risk state operations such as `save_memory` (`requiresConfirmation = false`) execute inline subject to policy validation.
   - The API returns a structured response of type `confirmation_required` to the user interface for financial actions. No financial record is modified without explicit confirmation.

2. **User Identity Boundary**:
   - Authenticated user identity (`userId`) comes strictly from the verified JWT context (`AgentToolContext.userId`).
   - The model is strictly prohibited from supplying `userId` in tool arguments or confirmation payloads. Any attempt to inject `userId` is rejected by argument validation (`forbidNonWhitelisted: true`).

3. **Single-Use Replay Protection & Atomic Concurrency**:
   - Confirmations use atomic database transactions with conditional state transitions (`PENDING` → `CONSUMED`).
   - Once a confirmation is consumed or cancelled, subsequent attempt requests return `400 Bad Request`. Replay attacks and race conditions are impossible.

4. **Tenant Isolation (IDOR Protection)**:
   - Confirmations are strictly bound to `userId`. User B cannot inspect, execute, or cancel User A's confirmation request (returns `404 Not Found`).
   - Account ownership is enforced by `TransactionService` during execution. If an account does not belong to the user, creation fails safely.

---

## 2. Confirmation Lifecycle & State Machine

```text
               ┌──────────┐
               │ PENDING  │
               └────┬─────┘
                    │
       ┌────────────┼────────────┐
       │            │            │
       ▼            ▼            ▼
 ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ CONSUMED │ │CANCELLED │ │ EXPIRED  │
 └──────────┘ └──────────┘ └──────────┘
```

### Lifecycle States

| State | Description | Transition Trigger |
|---|---|---|
| `PENDING` | Created when agent proposes a write tool call. Awaiting explicit user confirmation. | Default state upon creation. |
| `CONSUMED` | Atomically updated when user calls `POST /ai-agent/confirmations/:id`. Tool execution proceeds. | Successful confirmation execution. |
| `CANCELLED` | User explicitly cancels via `POST /ai-agent/confirmations/:id/cancel`. Execution blocked. | User call to cancel endpoint. |
| `EXPIRED` | Exceeds time-to-live (`AI_CONFIRMATION_TTL_SECONDS`, default: 300s). Execution blocked. | System clock past `expiresAt`. |

---

## 3. Tool Specification: `create_transaction`

| Property | Value |
|---|---|
| **Tool Name** | `create_transaction` |
| **Capability** | `AgentCapability.CREATE_TRANSACTION` |
| **Risk Level** | `AgentToolRiskLevel.MEDIUM` |
| **Read-Only** | `false` |
| **Description** | Create a new financial transaction (income or expense) for the authenticated user. |

### Input Schema & Argument DTO Validation (`CreateTransactionArgsDto`)

```json
{
  "type": "object",
  "properties": {
    "accountId": { "type": "string", "description": "Account UUID" },
    "type": { "type": "string", "enum": ["INCOME", "EXPENSE"] },
    "amount": { "type": "number", "minimum": 0.0001, "maximum": 999999999999.9999 },
    "description": { "type": "string" },
    "transactionAt": { "type": "string", "description": "ISO date-time string" },
    "categoryId": { "type": "string", "description": "Optional category UUID" }
  },
  "required": ["accountId", "type", "amount", "transactionAt"],
  "additionalProperties": false
}
```

---

## 4. API Endpoints & Response Contracts

### 1. `POST /ai-agent/messages` (Propose Write Action)

When the model calls `create_transaction`, the endpoint returns HTTP 200 with `confirmation_required`:

```json
{
  "type": "confirmation_required",
  "message": "I need your confirmation before creating a new expense transaction of BRL 50.75 for Lunch expense.",
  "confirmation": {
    "id": "c7a2e5d1-9f8e-4a3b-9c2d-1e8f7a6b5c4d",
    "tool": "create_transaction",
    "riskLevel": "MEDIUM",
    "parameters": {
      "accountId": "a1111111-1111-4111-8111-111111111111",
      "type": "EXPENSE",
      "amount": 50.75,
      "description": "Lunch expense",
      "transactionAt": "2026-09-13T12:00:00.000Z"
    },
    "expiresAt": "2026-09-13T12:05:00.000Z"
  }
}
```

### 2. `POST /ai-agent/confirmations/:confirmationId` (Execute Mutation)

**Headers**: `Authorization: Bearer <jwt>`

**Response (HTTP 200)**:
```json
{
  "status": "success",
  "confirmationId": "c7a2e5d1-9f8e-4a3b-9c2d-1e8f7a6b5c4d",
  "result": {
    "message": "Transaction created successfully",
    "transaction": {
      "id": "tx-12345",
      "accountId": "a1111111-1111-4111-8111-111111111111",
      "type": "EXPENSE",
      "amount": 50.75,
      "description": "Lunch expense",
      "transactionAt": "2026-09-13T12:00:00.000Z",
      "source": "MANUAL"
    }
  }
}
```

**Error Responses**:
- `400 Bad Request`: Confirmation expired, cancelled, or already consumed.
- `404 Not Found`: Confirmation ID does not exist or belongs to another user.

### 3. `POST /ai-agent/confirmations/:confirmationId/cancel` (Cancel Pending Action)

**Headers**: `Authorization: Bearer <jwt>`

**Response (HTTP 200)**:
```json
{
  "status": "cancelled",
  "confirmationId": "c7a2e5d1-9f8e-4a3b-9c2d-1e8f7a6b5c4d"
}
```

---

## 5. Environment & Database Configuration

- **Database Model**: `AiConfirmation` in `prisma/schema.prisma` with fields `id`, `userId`, `toolName`, `parameters`, `riskLevel`, `status`, `expiresAt`, `createdAt`, `consumedAt`.
- **Environment Variable**: `AI_CONFIRMATION_TTL_SECONDS` (Default: `300`).
