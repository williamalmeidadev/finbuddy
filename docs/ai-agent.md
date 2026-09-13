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
   - `AiAgentController` → `AiAgentService` → `AiAgentOrchestratorService` → `AgentToolArgumentValidatorService` → `AgentToolAuthorizationService` → `AgentToolRegistryService` → `Application Tool` → `Financial Service` → `Repository` → `PostgreSQL`.
   - Application services remain completely agnostic of underlying LLM transport and protocol nuances.

4. **Zero LLM Direct Database Access & Tenant Boundary**:
   - The LLM has zero direct access to Prisma repositories, raw SQL query executors, or database credentials.
   - Authenticated user identity (`userId`) originates solely from cryptographically verified JWT tokens.
   - The LLM cannot authorize requests or bypass domain ownership checks.

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

### 3.3 Application-Level Argument Validation
Model tool arguments are parsed, validated, and normalized before reaching any authorization or domain service:
- `get_accounts`: Enforces empty object `{}`. Rejects injected properties (such as `userId`).
- `get_transactions`: Validates `accountId` UUID format, limits pagination strictly between 1 and 100, and non-negative offsets.
- `get_financial_summary`: Validates `month` format strictly against `YYYY-MM`.
- `get_budgets`: Validates `categoryId` UUID format and `month` format `YYYY-MM`.
- `create_transaction`: Validates `accountId` UUID, `type` enum (`INCOME` / `EXPENSE`), positive `amount`, `transactionAt` ISO date string, optional `description`, and optional `categoryId` UUID.

---

## 4. Evaluation Harness & Security Regression Framework

The evaluation harness (`test/ai-agent/evaluation/`) provides a deterministic, repeatable offline test suite covering 46 scenarios:
- **Offline Executions**: Uses `MockOpenAIClientEvaluation` to run scenarios without live OpenAI API network dependencies.
- **Regression Suite**: Executes via `npm run ai:evaluate` or standard `npm test`.
- **Security & Observability Matrix Coverage**: Validates IDOR prevention, prompt injection resistance, indirect injection safety, hallucination grounding, tool failure handling, iteration bounds, write tool confirmation requirements (WT-01 through WT-10), and request observability/audit events (OBS-01 through OBS-10).
- Full details documented in [`docs/ai-agent-evaluation.md`](file:///home/williamalmeida/github/finbuddy/docs/ai-agent-evaluation.md), [`docs/ai-agent-write-tools.md`](file:///home/williamalmeida/github/finbuddy/docs/ai-agent-write-tools.md), and [`docs/ai-agent-observability.md`](file:///home/williamalmeida/github/finbuddy/docs/ai-agent-observability.md).

---

## 5. Current Limitations & Roadmap

### Current Limitations
- **Limited Write Scope**: Only transaction creation (`create_transaction`) is exposed. Updates, deletes, recurring transactions, and transfers are not exposed.
- **No Conversation Memory**: Endpoint is stateless per request run; multi-turn conversation memory is not persisted across HTTP requests.
- **No RAG / Vector Search**: No vector embeddings, RAG, or Redis memory persistence.

### Phase Roadmap

| Phase | Milestone | Status |
|---|---|---|
| **Phase 1** | **AI Agent Foundation** | **Completed** |
| **Phase 2** | **Financial Read Tools & Tool-Calling Loop** | **Completed** |
| **Phase 3** | **Agent Guardrails & Tool Authorization** | **Completed** |
| **Phase 4** | **Agent Evaluation Harness** | **Completed** |
| **Phase 13** | **Financial Write Tools & Confirmation** | **Completed** |
| **Phase 14** | **AI Agent Observability & Auditability** | **Completed** |
| **Phase 15** | **Conversational Memory & State** | Planned |

