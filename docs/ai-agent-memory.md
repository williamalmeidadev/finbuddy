# FinBuddy — AI Agent Memory / Context Management

## 1. Overview

Phase 16 introduces structured, user-owned, bounded, and validated memory management for the FinBuddy AI Agent. This system enables FinBuddy to persist explicit user preferences, financial targets, and budgeting styles across separate conversation sessions without relying on vector embeddings, pgvector, or semantic search.

Memory is handled strictly as untrusted user context injected into the model prompt under `<user_memory>...</user_memory>`.

---

## 2. Architecture & Data Model

Memory entries are stored in PostgreSQL using Prisma with strict user isolation:

```text
User (id)
 └── AiMemory (id, userId, type, key, value, createdAt, updatedAt)
      └── Unique Constraint: @@unique([userId, type, key])
```

### Prisma Enums & Models
- **`AiMemoryType`**:
  - `PREFERENCE`: User preferences (e.g. `preferred_currency`, `preferred_language`, `preferred_date_format`, `preferred_summary_period`).
  - `FINANCIAL_GOAL`: Financial targets (e.g. `monthly_savings_target`, `emergency_fund_target`, `spending_limit_goal`).
  - `GENERAL_CONTEXT`: General context preferences (e.g. `budgeting_style`).
- **`AiMemory`**: Model holding key-value pairs per user and memory type.

---

## 3. Allowed Memory Policy & Validation

`AiMemoryPolicyService` enforces strict security, format, and capacity boundaries:

1. **Strict Key Allowlist**:
   - `PREFERENCE`: `preferred_currency`, `preferred_language`, `preferred_date_format`, `preferred_summary_period`
   - `FINANCIAL_GOAL`: `monthly_savings_target`, `emergency_fund_target`, `spending_limit_goal`
   - `GENERAL_CONTEXT`: `budgeting_style`
2. **Format Validation**:
   - Currency: ISO 4217 3-letter code (e.g. `BRL`, `USD`, `EUR`).
   - Language: Locale format (e.g. `pt-BR`, `en-US`).
   - Summary period: `monthly`, `weekly`, `yearly`.
   - Numeric goals: Positive monetary decimal values.
   - Budgeting style: `monthly`, `zero_based`, `50_30_20`, `envelope`.
3. **Prompt Injection Prevention**:
   - Values containing instructions such as `ignore previous instructions`, `system:`, `call create_transaction`, `confirmed=true`, or `<script` are rejected.
4. **Capacity Bounds**:
   - Maximum 20 memory entries per user (`MAX_MEMORIES_PER_USER = 20`).
   - Maximum 500 characters per value (`MAX_MEMORY_VALUE_LENGTH = 500`).

---

## 4. Security & Boundary Invariants

1. **Untrusted Context Injection**: Memory is injected into prompt instructions inside `<user_memory>` tags explicitly marked as untrusted user context.
2. **No Capability Escalation**: Memory context cannot grant tool capabilities, override authorization checks, or bypass write tool confirmation.
3. **Financial Truth Preservation**: Financial data and balances remain strictly sourced from read tools (`get_accounts`, `get_transactions`, `get_financial_summary`, `get_budgets`), never replaced by stored memory values.
4. **IDOR & User Isolation**: All database operations use `where: { id: memoryId, userId }`. Users can only list, create, update, or delete their own memories.
5. **Inline AI Write Tool (`save_memory`)**:
   - `capability = MANAGE_MEMORY`
   - `riskLevel = LOW`
   - `requiresConfirmation = false` (executes inline without requiring human confirmation).

---

## 5. API Endpoints

- `POST /ai-agent/memories`: Create or upsert a structured memory entry (`{ type, key, value }`).
- `GET /ai-agent/memories`: List user memories (optional filter `?type=PREFERENCE`).
- `GET /ai-agent/memories/:memoryId`: Retrieve details of a single memory entry.
- `PATCH /ai-agent/memories/:memoryId`: Update value of a single memory entry (`{ value }`).
- `DELETE /ai-agent/memories/:memoryId`: Delete single memory entry.
- `DELETE /ai-agent/memories`: Delete all memories for the authenticated user.

---

## 6. Observability & Auditability

The memory system emits metadata-only observability events and metrics:
- **Events**:
  - `ai.memory.created`
  - `ai.memory.updated`
  - `ai.memory.deleted`
  - `ai.memory.rejected`
  - `ai.memory.loaded`
- **Metrics**:
  - `ai_memories_created_total`
  - `ai_memories_updated_total`
  - `ai_memories_deleted_total`
  - `ai_memories_rejected_total`
  - `ai_memories_loaded_total`
