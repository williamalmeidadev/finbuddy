# AI Agent Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance FinBuddy AI Agent with Server-Sent Events (SSE) streaming capabilities, memory relevance filtering & smart preference auto-extraction, and proactive budget alert automation.

**Architecture:** 
1. Implement NestJS SSE controller endpoint (`GET /api/v1/ai-agent/chat/stream`) emitting typed JSON event streams (`text_chunk`, `tool_start`, `tool_completed`, `confirmation_required`, `done`).
2. Enhance `AiMemoryService` with token-aware memory relevance scoring and pattern-matching preference auto-extraction.
3. Add `AiAgentProactiveAlertsService` with cron schedule checking user budget consumption and emitting financial warning insights.

**Tech Stack:** NestJS, RxJS Observable/Subject, OpenAI API, Prisma, Jest.

---

### Task 1: SSE Streaming Endpoint & Real-Time Progress Events

**Files:**
- Modify: `apps/api/src/ai-agent/ai-agent.controller.ts`
- Modify: `apps/api/src/ai-agent/ai-agent.service.ts`
- Modify: `apps/api/src/ai-agent/application/ai-agent-orchestrator.service.ts`
- Create: `apps/api/src/ai-agent/dto/stream-event.dto.ts`
- Test: `apps/api/src/ai-agent/ai-agent.controller.spec.ts`

**Interfaces:**
- Consumes: `RequestCorrelationOptions`, `AgentResponse`
- Produces: `Observable<MessageEvent>` for NestJS SSE endpoint `streamMessage`

- [ ] **Step 1: Create StreamEvent DTO interface**
- [ ] **Step 2: Add streamMessage method in AiAgentService and AiAgentOrchestratorService emitting RxJS events**
- [ ] **Step 3: Add @Sse('chat/stream') controller endpoint in AiAgentController**
- [ ] **Step 4: Write unit test for SSE streaming endpoint**
- [ ] **Step 5: Run tests and verify clean pass**
- [ ] **Step 6: Commit Etapa 1**

---

### Task 2: Memory Relevance Filtering & Smart Preference Extraction

**Files:**
- Modify: `apps/api/src/ai-agent/application/memory/ai-memory.service.ts`
- Modify: `apps/api/src/ai-agent/application/memory/ai-memory-policy.service.ts`
- Test: `apps/api/src/ai-agent/application/memory/ai-memory.service.spec.ts`

**Interfaces:**
- Consumes: `getUserMemories(userId)`, `saveMemory(userId, type, key, value)`
- Produces: `filterRelevantMemories(memories, query)`, `autoExtractAndSavePreferences(userId, text)`

- [ ] **Step 1: Write unit tests for memory relevance filtering and preference extraction**
- [ ] **Step 2: Implement relevance scoring filter and regex-based preference auto-extraction**
- [ ] **Step 3: Integrate preference extraction hook into processUserMessage workflow**
- [ ] **Step 4: Run memory tests and verify pass**
- [ ] **Step 5: Commit Etapa 2**

---

### Task 3: Proactive Financial Budget Alert Service

**Files:**
- Create: `apps/api/src/ai-agent/application/alerts/ai-agent-proactive-alerts.service.ts`
- Create: `apps/api/src/ai-agent/application/alerts/ai-agent-proactive-alerts.service.spec.ts`
- Modify: `apps/api/src/ai-agent/ai-agent.module.ts`

**Interfaces:**
- Consumes: `BudgetRepository`, `FinancialSummaryService`, `AiAgentObservabilityService`
- Produces: `checkUserBudgetAlerts(userId)`, `@Cron('0 9 * * *') runDailyBudgetHealthCheck()`

- [ ] **Step 1: Create AiAgentProactiveAlertsService with budget threshold evaluation**
- [ ] **Step 2: Write unit tests in ai-agent-proactive-alerts.service.spec.ts**
- [ ] **Step 3: Register service in AiAgentModule**
- [ ] **Step 4: Run unit test suite and verify 100% pass**
- [ ] **Step 5: Commit Etapa 3**
