# FinBuddy AI Agent — Financial Write Tools & Human Confirmation Architecture

## 1. Executive Summary & Security Philosophy

Phase 13, 17A, and 17B introduce FinBuddy's financial write tools: `create_transaction`, `update_transaction`, and `delete_transaction`.

Because financial mutations carry inherent risk (unintended charges, duplicated records, erroneous amounts, unintended deletions), FinBuddy enforces a strict **Human-in-the-Loop Confirmation Policy** for all financial mutations.

### Core Security Invariants

```text
LLM output → UNTRUSTED → Argument Validation → Tool Authorization → Risk Assessment → Confirmation Check → Pending State → Human Confirmation → Domain Execution → Database
```

1. **Zero Direct LLM Inline Database Financial Mutations**:
   - The LLM can propose financial transaction creation, update, or deletion, but **cannot execute database writes inline** during the conversational tool loop for financial mutations.
   - When a financial write tool (`create_transaction`, `update_transaction`, `delete_transaction`, `requiresConfirmation = true`) is selected by the model, the orchestrator intercepts execution, validates arguments, checks authorization, and creates a pending `AiConfirmation` entity.
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
   - Account and transaction ownership is enforced by `TransactionService` during execution. If an account or transaction does not belong to the user, the operation fails safely.

5. **Transfer-Linked & System Protection**:
   - System-sourced transactions (`source: SYSTEM`) and transfer-linked transactions (`transferId !== null`) are protected from being updated or deleted via AI tools.

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

## 3. Financial Write Tools Specifications

### 1. `create_transaction`

| Property | Value |
|---|---|
| **Tool Name** | `create_transaction` |
| **Capability** | `AgentCapability.CREATE_TRANSACTION` |
| **Risk Level** | `AgentToolRiskLevel.MEDIUM` |
| **Read-Only** | `false` |
| **Description** | Create a new financial transaction (income or expense) for the authenticated user. |

### 2. `update_transaction`

| Property | Value |
|---|---|
| **Tool Name** | `update_transaction` |
| **Capability** | `AgentCapability.UPDATE_TRANSACTION` |
| **Risk Level** | `AgentToolRiskLevel.MEDIUM` |
| **Read-Only** | `false` |
| **Description** | Update an existing financial transaction (amount, description, type, category, account, or date) for the authenticated user. |

### 3. `delete_transaction`

| Property | Value |
|---|---|
| **Tool Name** | `delete_transaction` |
| **Capability** | `AgentCapability.DELETE_TRANSACTION` |
| **Risk Level** | `AgentToolRiskLevel.HIGH` |
| **Read-Only** | `false` |
| **Description** | Delete an existing financial transaction for the authenticated user and restore account balance. |

#### Input Schema & Argument DTO Validation (`DeleteTransactionArgsDto`)

```json
{
  "type": "object",
  "properties": {
    "transactionId": { "type": "string", "description": "Transaction UUID to delete" }
  },
  "required": ["transactionId"],
  "additionalProperties": false
}
```

### 5. `update_transfer`

| Property | Value |
|---|---|
| **Tool Name** | `update_transfer` |
| **Capability** | `AgentCapability.UPDATE_TRANSFER` |
| **Risk Level** | `AgentToolRiskLevel.HIGH` |
| **Read-Only** | `false` |
| **Description** | Update an existing financial transfer between two accounts belonging to the authenticated user. Atomically synchronizes Transfer, source/destination account balances, and linked SYSTEM transactions. |

#### Input Schema & Argument DTO Validation (`UpdateTransferArgsDto`)

```json
{
  "type": "object",
  "properties": {
    "transferId": { "type": "string", "description": "UUID of the transfer to update" },
    "amount": { "type": "number", "minimum": 0.0001, "maximum": 999999999999.9999, "description": "Optional updated positive transfer amount" },
    "transactionAt": { "type": "string", "description": "Optional updated transfer ISO date-time string" },
    "fromAccountId": { "type": "string", "description": "Optional updated source account UUID" },
    "toAccountId": { "type": "string", "description": "Optional updated destination account UUID" }
  },
  "required": ["transferId"],
  "additionalProperties": false
}
```

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
