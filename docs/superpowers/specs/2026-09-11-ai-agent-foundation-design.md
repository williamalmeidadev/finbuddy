# FinBuddy AI Agent Foundation — Architectural Design Spec

**Date:** 2026-09-11  
**Status:** Approved  
**Branch:** `feat/ai-agent-foundation`

---

## 1. Executive Summary

This document specifies the architectural design for the initial **AI Agent Foundation** of the FinBuddy backend REST API.

The goal is to establish a secure, modular, and extensible infrastructure for an AI financial assistant using **OpenAI only** (`openai` official TypeScript SDK and the **OpenAI Responses API** (`client.responses.create`)).

Key principles:
- **No external AI framework abstractions** (No LangChain, LangGraph, Vercel AI SDK, Anthropic, etc.).
- **Strict layered architecture**: `Controller` → `Service` → `Orchestrator` → `OpenAIClient` → `OpenAI Responses API`.
- **Zero financial tool execution** in this initial phase (empty tool registry foundation prepared for future read/write tools).
- **Strict tenant isolation & security boundary**: Authenticated user identity (`userId`) comes strictly from JWT auth context. The LLM never accesses Prisma repositories or generates raw database queries.
- **Client-safe error handling & secret protection**: API keys and raw prompt traces are never exposed in logs or API responses. Upstream failures translate into standardized `503 Service Unavailable` API responses.

---

## 2. Directory Structure & Module Architecture

All AI agent logic resides in `src/ai-agent/`:

```text
src/ai-agent/
├── ai-agent.module.ts
├── ai-agent.controller.ts
├── ai-agent.service.ts
├── application/
│   ├── ai-agent-orchestrator.service.ts
│   ├── prompts/
│   │   └── finbuddy-agent.instructions.ts
│   └── tools/
│       ├── agent-tool.interface.ts
│       └── agent-tool-registry.service.ts
├── domain/
│   ├── agent-message.ts
│   └── agent-response.ts
├── dto/
│   ├── send-agent-message.dto.ts
│   └── agent-response.dto.ts
└── infrastructure/
    └── openai/
        ├── openai.client.ts
        └── openai.types.ts
```

### Component Responsibilities

1. **`AiAgentController` (`ai-agent.controller.ts`)**:
   - Handles `POST /ai-agent/messages`.
   - Guarded with `@UseGuards(JwtAuthGuard)`.
   - Extracts user context via `@CurrentUser()`.
   - Validates input body `SendAgentMessageDto` (`message: string`).
   - Returns `AgentResponseDto` (`message: string`).

2. **`AiAgentService` (`ai-agent.service.ts`)**:
   - Application entry point called by the controller.
   - Delegates message execution to `AiAgentOrchestratorService`.
   - Handles metrics tracking (`ai_agent_requests_total`, `ai_agent_requests_success_total`, `ai_agent_requests_failure_total`, duration timing).

3. **`AiAgentOrchestratorService` (`application/ai-agent-orchestrator.service.ts`)**:
   - Orchestrates prompt assembly, agent instructions loading, model choice, and tool definitions from `AgentToolRegistryService`.
   - Invokes `OpenAIClient.createResponse(...)`.
   - Validates response payload structure and returns domain model `AgentResponse`.

4. **`FinBuddyAgentInstructions` (`application/prompts/finbuddy-agent.instructions.ts`)**:
   - Centralized system instructions defining assistant persona, clarity, zero hallucination of financial data, and distinction between financial information and financial actions.

5. **`AgentToolRegistryService` (`application/tools/agent-tool-registry.service.ts`)**:
   - Manages registered agent tools (`AgentTool` interface).
   - Currently returns an empty array of tool definitions.

6. **`OpenAIClient` (`infrastructure/openai/openai.client.ts`)**:
   - Wraps the official `openai` SDK `OpenAI` client.
   - Reads `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_TIMEOUT_MS` from `ConfigService`.
   - Calls `client.responses.create({ model, instructions, input })`.
   - Catches SDK timeouts/API errors and normalizes them into application exceptions (`ServiceUnavailableException`).

---

## 3. Environment & Configuration Integration

Add the following environment variables to `src/config/env.validation.ts`:

| Variable | Type | Validation | Default |
|----------|------|------------|---------|
| `OPENAI_API_KEY` | `string` | `@IsOptional() @IsString()` (Required when invoking AI Client) | `undefined` |
| `OPENAI_MODEL` | `string` | `@IsOptional() @IsString()` | `'gpt-5.5'` |
| `OPENAI_TIMEOUT_MS` | `number` | `@IsOptional() @IsNumber()` | `30000` |

If `OPENAI_API_KEY` is omitted or empty when `POST /ai-agent/messages` is called, `OpenAIClient` throws `ServiceUnavailableException('AI service is not configured')`.

---

## 4. API Specification & Request Flow

### Endpoint: `POST /ai-agent/messages`

- **Authentication**: Required (`Bearer <JWT>`)
- **Rate Limit**: Governed by global API Throttler (`RateLimitGuard`).

#### Request DTO (`SendAgentMessageDto`)
```typescript
export class SendAgentMessageDto {
  @ApiProperty({
    description: 'User message or prompt for the AI assistant',
    example: 'Hello FinBuddy, how can you help me with my finances?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
```

#### Response DTO (`AgentResponseDto`)
```typescript
export class AgentResponseDto {
  @ApiProperty({
    description: 'AI assistant text response',
    example: 'Hello! I am FinBuddy, your personal finance assistant...',
  })
  @IsString()
  message: string;
}
```

---

## 5. Security & Isolation Boundaries

1. **User Identity Protection**:
   - `userId` is obtained exclusively from JWT payload (`req.user.id`).
   - Request body fields claiming `userId` are rejected by global `ValidationPipe` (`forbidNonWhitelisted: true`).

2. **Database & LLM Isolation**:
   - The LLM has no access to Prisma, SQL generation, or database repositories.
   - Architectural flow:
     ```text
     LLM → Tool Call Request (Future) → Application Validation → Application Service → Prisma → PostgreSQL
     ```
   - In this foundation phase, zero tools are executed.

3. **Log & Secret Privacy**:
   - `OPENAI_API_KEY` is never printed, logged, or returned in HTTP responses.
   - Raw user prompts and AI responses are omitted or truncated in standard request logs to prevent sensitive financial data leakage.

---

## 6. Testing Strategy

### Unit Tests
- `openai.client.spec.ts`: Test response generation, error translation (timeout, rate limit, auth error, 500 error), missing API key handling.
- `ai-agent-orchestrator.service.spec.ts`: Test orchestration, prompt construction, model selection.
- `agent-tool-registry.service.spec.ts`: Test empty tool registry contract.
- `ai-agent.service.spec.ts`: Test metrics incrementing and error propagation.
- `ai-agent.controller.spec.ts`: Test controller user context binding.

### E2E Tests (`test/ai-agent.e2e-spec.ts`)
- Reject unauthenticated requests (401).
- Input validation (missing message, empty message, oversized message, extra properties -> 400).
- Successful message response (mocked OpenAI SDK).
- Error mapping (mocked OpenAI failure -> 503 Service Unavailable).
- Verification of zero secret or raw error leakage.

---

## 7. Operational & Documentation Deliverables
- `docs/ai-agent.md`: Comprehensive documentation covering architecture, request flow, security rules, and future tool roadmap.
- `docs/superpowers/plans/2026-09-11-ai-agent-foundation.md`: Implementation plan generated via `writing-plans`.
