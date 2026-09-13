# FinBuddy AI Agent Architecture & Financial Read Tools Documentation

## 1. Executive Summary & Core Philosophy

The FinBuddy AI Agent module (`src/ai-agent/`) provides a secure, modular, and resilient foundation for an AI-powered personal financial assistant. It is built natively for NestJS 11 using TypeScript, Prisma, PostgreSQL 17, and the official OpenAI Node.js SDK (Responses API).

### Core Architectural Principles

1. **Vendor SDK Only (Zero Framework Bloat)**:
   - Built exclusively with the official `openai` SDK (`OpenAI`).
   - Avoids heavyweight or rapidly-shifting orchestration frameworks such as LangChain, LangGraph, or Vercel AI SDK. This ensures minimal attack surface, direct dependency control, strict TypeScript typing, and predictable runtime behavior.

2. **OpenAI Responses API Exclusively**:
   - Employs OpenAI's modern Responses API (`client.responses.create`), bypassing deprecated or legacy conversational completions abstractions.
   - Provides clean separation of static system instructions, dynamic user input, model configuration, and function tool definitions.

3. **Strict Layered Separation of Concerns**:
   - `AiAgentController` → `AiAgentService` → `AiConversationService` → `AiAgentOrchestratorService` → `AgentToolArgumentValidatorService` → `AgentToolAuthorizationService` → `AgentToolRegistryService` → `Application Tool` → `Financial Service` → `Repository` → `PostgreSQL`.
   - Application services remain completely agnostic of underlying LLM transport and protocol nuances.

4. **Zero LLM Direct Database Access & Tenant Boundary**:
   - The LLM has zero direct access to Prisma repositories, raw SQL query executors, or database credentials.
   - Authenticated user identity (`userId`) originates solely from cryptographically verified JWT tokens.
   - The LLM cannot authorize requests or bypass domain ownership checks.
   - Stateful conversation history is stored per user in `AiConversation` and `AiConversationMessage` tables (Phase 15).

5. **Client-Safe Error Translation & Zero Secret Leakage**:
   - Upstream OpenAI rate limits, timeouts, service outages, tool errors, and iteration bounds are translated into standardized HTTP responses (`503 Service Unavailable`, `400 Bad Request`, `401 Unauthorized`).
   - API keys, raw upstream error stacks, internal database details, and system instructions are never exposed to clients.

---

## 2. Layered Architecture & Security Guardrail Flow

```text
                 ┌─────────────────────┐
                 │     User Request    │
                 └──────────┬──────────┘
                            ↓
                 ┌─────────────────────┐
                 │   JWT Auth Context  │
                 └──────────┬──────────┘
                            ↓
                 ┌─────────────────────┐
                 │   Agent Orchestrator│
                 └──────────┬──────────┘
                            ↓
                 ┌─────────────────────┐
                 │   OpenAI Responses  │
                 └──────────┬──────────┘
                            ↓
                    Model Tool Call
                            ↓
                 ┌─────────────────────┐
                 │ Argument Validation │
                 └──────────┬──────────┘
                            ↓
                 ┌─────────────────────┐
                 │ Tool Authorization  │
                 └──────────┬──────────┘
                            ↓
                 ┌─────────────────────┐
                 │   Tool Registry     │
                 └──────────┬──────────┘
                            ↓
                 ┌─────────────────────┐
                 │ Financial Services  │
                 └──────────┬──────────┘
                            ↓
                 ┌─────────────────────┐
                 │      PostgreSQL     │
                 └──────────┬──────────┘
```

### Component Responsibilities

| Component | Layer | Path | Responsibility |
|---|---|---|---|
| `AiAgentController` | Presentation | `src/ai-agent/ai-agent.controller.ts` | Exposes `POST /ai-agent/messages`, enforces `JwtAuthGuard`, validates DTO payloads, strips unwhitelisted fields, and maps domain responses to `AgentResponseDto`. |
| `AiAgentService` | Application | `src/ai-agent/ai-agent.service.ts` | Primary application boundary service. Records metrics counters (`ai_requests_total`, `ai_requests_success_total`) and measures request duration. |
| `AiAgentOrchestratorService` | Orchestration | `src/ai-agent/application/ai-agent-orchestrator.service.ts` | Coordinates the tool-calling loop, enforces `MAX_TOOL_ITERATIONS = 5`, validates arguments, checks tool authorization, executes registered tools, sends tool outputs back to OpenAI, and formats `AgentResponse`. |
| `AgentToolArgumentValidatorService` | Guardrails / Validation | `src/ai-agent/application/validation/agent-tool-argument-validator.service.ts` | Validates model tool arguments independently using `class-validator` DTOs (`forbidNonWhitelisted: true`, UUID verification, YYYY-MM month checks, bounded limits). |
| `AgentToolAuthorizationService` | Security / Authorization | `src/ai-agent/application/authorization/agent-tool-authorization.service.ts` | Enforces capability authorization policies (`AgentToolPolicy`). Verifies tool capability metadata and prevents unauthorized execution. |
| `AgentToolRegistryService` | Tooling Registry | `src/ai-agent/application/tools/agent-tool-registry.service.ts` | Centralized registry discovering executable tools, converting schemas to OpenAI format, and resolving tools by exact string name. Prevents arbitrary method execution. |
| `GetAccountsTool` | Application Tool | `src/ai-agent/application/tools/impl/get-accounts.tool.ts` | Read-only tool `get_accounts`. Retains metadata (`READ_ACCOUNTS`, `LOW`, `readOnly: true`). Invokes `AccountService.findByUserId`. |
| `GetTransactionsTool` | Application Tool | `src/ai-agent/application/tools/impl/get-transactions.tool.ts` | Read-only tool `get_transactions`. Retains metadata (`READ_TRANSACTIONS`, `LOW`, `readOnly: true`). Invokes `TransactionService.findByUserId`. |
| `GetFinancialSummaryTool` | Application Tool | `src/ai-agent/application/tools/impl/get-financial-summary.tool.ts` | Read-only tool `get_financial_summary`. Retains metadata (`READ_FINANCIAL_SUMMARY`, `LOW`, `readOnly: true`). Invokes `FinancialSummaryService.getSummary`. |
| `GetBudgetsTool` | Application Tool | `src/ai-agent/application/tools/impl/get-budgets.tool.ts` | Read-only tool `get_budgets`. Retains metadata (`READ_BUDGETS`, `LOW`, `readOnly: true`). Invokes `BudgetService.findByUserId`. |
| `CreateTransactionTool` | Application Tool | `src/ai-agent/application/tools/impl/create-transaction.tool.ts` | Write tool `create_transaction`. Retains metadata (`CREATE_TRANSACTION`, `MEDIUM`, `readOnly: false`). Invokes `TransactionService.create`. |
| `UpdateTransactionTool` | Application Tool | `src/ai-agent/application/tools/impl/update-transaction.tool.ts` | Write tool `update_transaction`. Retains metadata (`UPDATE_TRANSACTION`, `MEDIUM`, `readOnly: false`). Invokes `TransactionService.update`. |
| `DeleteTransactionTool` | Application Tool | `src/ai-agent/application/tools/impl/delete-transaction.tool.ts` | Write tool `delete_transaction`. Retains metadata (`DELETE_TRANSACTION`, `HIGH`, `readOnly: false`). Invokes `TransactionService.delete`. |
| `CreateTransferTool` | Application Tool | `src/ai-agent/application/tools/impl/create-transfer.tool.ts` | Write tool `create_transfer`. Retains metadata (`CREATE_TRANSFER`, `HIGH`, `readOnly: false`, `requiresConfirmation: true`). Invokes `TransferService.create`. |
| `UpdateTransferTool` | Application Tool | `src/ai-agent/application/tools/impl/update-transfer.tool.ts` | Write tool `update_transfer`. Retains metadata (`UPDATE_TRANSFER`, `HIGH`, `readOnly: false`, `requiresConfirmation: true`). Invokes `TransferService.update`. |
| `DeleteTransferTool` | Application Tool | `src/ai-agent/application/tools/impl/delete-transfer.tool.ts` | Write tool `delete_transfer`. Retains metadata (`DELETE_TRANSFER`, `HIGH`, `readOnly: false`, `requiresConfirmation: true`). Invokes `TransferService.delete`. |
| `SaveMemoryTool` | Application Tool | `src/ai-agent/application/tools/impl/save-memory.tool.ts` | Write tool `save_memory`. Retains metadata (`MANAGE_MEMORY`, `LOW`, `readOnly: false`, `requiresConfirmation: false`). Invokes `AiMemoryService.saveMemory`. |
| `AiMemoryService` | Application Service | `src/ai-agent/application/memory/ai-memory.service.ts` | Manages memory lifecycle, policy validation, length checks, user isolation, and formatting `<user_memory>` context for model injection. |
| `AiConfirmationService` | Application Service | `src/ai-agent/application/ai-confirmation.service.ts` | Manages confirmation lifecycle, pending state, TTL expiration, single-use atomic consumption, and explicit user cancellation. |
| `OpenAIClient` | Infrastructure | `src/ai-agent/infrastructure/openai/openai.client.ts` | Manages lazy instantiation of official `OpenAI` SDK client, injects timeout configurations (`OPENAI_TIMEOUT_MS`), handles multi-turn `previous_response_id`, and parses function calls. |
| `FINBUDDY_AGENT_INSTRUCTIONS` | Domain / Policy | `src/ai-agent/application/prompts/finbuddy-agent.instructions.ts` | System prompt defining FinBuddy's persona, prompt injection defenses, tool output trust boundary, anti-hallucination rules, write confirmation prompts, and non-authoritative execution safeguards. |

---

## 3. Dedicated Security Architecture & Guardrails

The application establishes a formal security boundary between the LLM and application capabilities.

```text
The LLM is untrusted.

The LLM does not authorize operations.

The LLM does not access the database.

The LLM cannot execute arbitrary application code.

The LLM cannot directly mutate database records without explicit application-level human confirmation.

The application validates and authorizes every tool call.
```

### 3.1 Authentication & Authorization Separation
- **Authentication**: JWT token answers *Who is making this request?* User identity (`userId`) comes strictly from authenticated JWT claims (`AgentToolContext.userId`).
- **Authorization**: Application authorization service (`AgentToolAuthorizationService`) answers *What is this request allowed to do?* Every tool declares explicit metadata (`capability`, `riskLevel`, `readOnly`).

### 3.2 Tool Capabilities & Metadata
Currently authorized capabilities:
- `get_accounts` → `READ_ACCOUNTS` (`readOnly: true`, `riskLevel: LOW`)
- `get_transactions` → `READ_TRANSACTIONS` (`readOnly: true`, `riskLevel: LOW`)
- `get_financial_summary` → `READ_FINANCIAL_SUMMARY` (`readOnly: true`, `riskLevel: LOW`)
- `get_budgets` → `READ_BUDGETS` (`readOnly: true`, `riskLevel: LOW`)
- `create_transaction` → `CREATE_TRANSACTION` (`readOnly: false`, `riskLevel: MEDIUM`)
- `update_transaction` → `UPDATE_TRANSACTION` (`readOnly: false`, `riskLevel: MEDIUM`)
- `delete_transaction` → `DELETE_TRANSACTION` (`readOnly: false`, `riskLevel: HIGH`)
- `create_transfer` → `CREATE_TRANSFER` (`readOnly: false`, `riskLevel: HIGH`)
- `save_memory` → `MANAGE_MEMORY` (`readOnly: false`, `riskLevel: LOW`, `requiresConfirmation: false`)

### 3.3 Application-Level Argument Validation
Model tool arguments are parsed, validated, and normalized before reaching any authorization or domain service:
- `get_accounts`: Enforces empty object `{}`. Rejects injected properties (such as `userId`).
- `get_transactions`: Validates `accountId` UUID format, limits pagination strictly between 1 and 100, and non-negative offsets.
- `get_financial_summary`: Validates `month` format strictly against `YYYY-MM`.
- `get_budgets`: Validates `categoryId` UUID format and `month` format `YYYY-MM`.
- `create_transaction`: Validates `accountId` UUID, `type` enum (`INCOME` / `EXPENSE`), positive `amount`, `transactionAt` ISO date string, optional `description`, and optional `categoryId` UUID.
- `update_transaction`: Validates `transactionId` UUID, requiring at least one optional update field (`amount`, `description`, `type`, `categoryId`, `accountId`, `transactionAt`).
- `delete_transaction`: Validates `transactionId` UUID format.
- `create_transfer`: Validates `fromAccountId` UUID, `toAccountId` UUID, enforces `fromAccountId !== toAccountId`, positive `amount`, and `transactionAt` ISO date string.
- `save_memory`: Validates `type` enum (`PREFERENCE` / `FINANCIAL_GOAL` / `GENERAL_CONTEXT`), `key` string length (1-100), and `value` string length (1-1000).

---

## 4. Evaluation Harness & Security Regression Framework

The evaluation harness (`test/ai-agent/evaluation/`) provides a deterministic, repeatable offline test suite covering 133 scenarios:
- **Offline Executions**: Uses `MockOpenAIClientEvaluation` to run scenarios without live OpenAI API network dependencies.
- **Regression Suite**: Executes via `npm run ai:evaluate` or standard `npm test`.
- **Security & Observability Matrix Coverage**: Validates IDOR prevention, prompt injection resistance, indirect injection safety, hallucination grounding, tool failure handling, iteration bounds, write tool confirmation requirements (WT-01 through WT-94), request observability/audit events (OBS-01 through OBS-10), conversation persistence (CP-01 through CP-14), and memory management (MEM-01 through MEM-15).
- Full details documented in [`docs/ai-agent-evaluation.md`](file:///home/williamalmeida/github/finbuddy/docs/ai-agent-evaluation.md), [`docs/ai-agent-memory.md`](file:///home/williamalmeida/github/finbuddy/docs/ai-agent-memory.md), [`docs/ai-agent-conversations.md`](file:///home/williamalmeida/github/finbuddy/docs/ai-agent-conversations.md), [`docs/ai-agent-write-tools.md`](file:///home/williamalmeida/github/finbuddy/docs/ai-agent-write-tools.md), and [`docs/ai-agent-observability.md`](file:///home/williamalmeida/github/finbuddy/docs/ai-agent-observability.md).

---

## 5. Current Limitations & Roadmap

### Current Limitations
- **Limited Write Scope**: Transaction creation (`create_transaction`), updating (`update_transaction`), deletion (`delete_transaction`), transfer creation (`create_transfer`), and memory saving (`save_memory`) are exposed. Transfer update/delete and recurring transaction write operations are not exposed via AI tools.
- **No Vector Search / Semantic Memory**: Structured memory is key-value based (`AiMemory`). No vector embeddings, pgvector, or semantic search.

### Phase Roadmap

| Phase | Milestone | Status |
|---|---|---|
| **Phase 1** | **AI Agent Foundation** | **Completed** |
| **Phase 2** | **Financial Read Tools & Tool-Calling Loop** | **Completed** |
| **Phase 3** | **Agent Guardrails & Tool Authorization** | **Completed** |
| **Phase 4** | **Agent Evaluation Harness** | **Completed** |
| **Phase 13** | **Financial Write Tools & Confirmation** | **Completed** |
| **Phase 14** | **AI Agent Observability & Auditability** | **Completed** |
| **Phase 15** | **AI Agent Conversation Persistence** | **Completed** |
| **Phase 16** | **AI Agent Memory / Context Management** | **Completed** |
| **Phase 17A** | **AI Financial Write Tool: update_transaction** | **Completed** |
| **Phase 17B** | **AI Financial Write Tool: delete_transaction** | **Completed** |
| **Phase 17C** | **AI Financial Write Tool: create_transfer** | **Completed** |
| **Phase 17D** | **AI Financial Write Tool: update_transfer** | **Completed** |
| **Phase 17E** | **AI Financial Write Tool: delete_transfer** | **Completed** |
| **Phase 18** | **AI Agent Advanced Evaluation Suite** | **Completed** |
| **Phase 19** | **AI Agent Production Hardening** | **Completed** |

---

## 6. Production Hardening Architecture & Defenses (Phase 19)

Phase 19 equips the FinBuddy AI Agent with explicit, deterministic production safeguards against upstream failures, runaway execution loops, resource exhaustion, and secret leakage.

### 6.1 Defense-in-Depth Control Pipeline

| Control Tier | Parameter / Setting | Default Value | Enforcement Location | Security / Resilience Goal |
|---|---|---|---|---|
| **Rate Limiting** | `AI_THROTTLE_TTL`<br>`AI_THROTTLE_LIMIT` | `60000ms`<br>`20 req/min` | `AiAgentController` (`@Throttle`) | Protects backend against denial-of-service and high-frequency automated polling. |
| **Input Validation** | `AI_MAX_INPUT_CHARS` | `2000 chars` | `AiAgentService` | Fast-rejects oversized prompts before invoking DB or OpenAI API. |
| **Context Windowing** | `AI_MAX_CONTEXT_CHARS`<br>`AI_MAX_MEMORY_CONTEXT_CHARS` | `15000 chars`<br>`2000 chars` | `AiAgentService` | Trims deep conversation history and bounds injected user memory context. |
| **Runaway Loop Protection** | `OPENAI_MAX_MODEL_CALLS`<br>`OPENAI_MAX_TOOL_ITERATIONS` | `10 calls`<br>`5 iterations` | `AiAgentOrchestratorService` | Prevents infinite tool-calling loops and controls API costs. |
| **Token Budgeting** | `OPENAI_MAX_OUTPUT_TOKENS` | `1000 tokens` | `OpenAIClient` | Restricts model response generation length per single LLM call. |
| **Circuit Breaker** | `AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD`<br>`AI_CIRCUIT_BREAKER_RESET_TIMEOUT_MS` | `5 failures`<br>`30000ms` | `OpenAIClient` | Fast-fails downstream requests during OpenAI outages to prevent thread pool exhaustion. |
| **User Concurrency** | `AI_MAX_CONCURRENT_REQUESTS_PER_USER` | `3 active requests` | `AiAgentService` | Prevents a single user from overwhelming system capacity with parallel requests. |
| **Secret Sanitization** | `redactSecrets(text)` | Regex replacement | `OpenAIClient` / Logger | Replaces API keys (`sk-***`), JWT tokens, and connection strings with masked placeholders. |

### 6.2 Implementation Topology vs Distributed Recommendation

> [!NOTE]
> Currently, stateful controls such as the Circuit Breaker (`CircuitBreakerState`), User Concurrency map (`activeRequestsPerUser`), and Rate Limiter use in-memory structures appropriate for single-instance NestJS node deployment. For multi-node distributed production environments, these counters should be backed by a centralized Redis cluster.


