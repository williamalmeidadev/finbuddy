# FinBuddy — AI Agent Conversation Persistence

## 1. Overview

Phase 15 introduces stateful conversation persistence to the FinBuddy AI Agent. This capability enables multi-turn conversation sessions across separate HTTP requests, storing user and assistant messages in PostgreSQL via Prisma.

## 2. Architecture & Data Model

Conversations and messages are modeled strictly with user isolation and role enforcement:

```text
User (id)
 └── AiConversation (id, userId, title, createdAt, updatedAt)
      └── AiConversationMessage (id, conversationId, role, content, sequenceNumber, createdAt)
```

### Prisma Enums & Models
- `ConversationMessageRole`: Restricted exclusively to `USER` and `ASSISTANT`.
- `AiConversation`: Scoped to `userId`.
- `AiConversationMessage`: Scoped to `conversationId`, content length capped at 4000 chars, ordered by `sequenceNumber`.

## 3. Security & Boundary Invariants

1. **Role Restriction**: Submitting `SYSTEM`, `DEVELOPER`, or `TOOL` message roles via API is rejected with `400 Bad Request`.
2. **IDOR Protection**: Every conversation operation enforces `where: { id: conversationId, userId }`. Attempting to read, append to, or delete another user's conversation returns `404 Not Found`.
3. **Immutability of Policies**: Conversation history is untrusted content. Historical text cannot alter tool authorization policies, modify permissions, or bypass write tool confirmation requirements.
4. **Data Grounding**: Financial balances and records are strictly sourced from active read tools (`get_accounts`, `get_transactions`, `get_financial_summary`, `get_budgets`), never inferred or trusted from historical message text.
5. **Bounded History Loading**: History loaded into LLM model context is capped at `MAX_CONVERSATION_MESSAGES = 20`.

## 4. API Endpoints

- `POST /ai-agent/conversations`: Create a new conversation session (`{ title?: string }`).
- `GET /ai-agent/conversations`: List paginated user conversations (`?page=1&limit=10`).
- `GET /ai-agent/conversations/:id`: Retrieve conversation metadata.
- `GET /ai-agent/conversations/:id/messages`: List paginated messages (`?page=1&limit=20`).
- `DELETE /ai-agent/conversations/:id`: Delete conversation and cascade deletion of messages.
- `POST /ai-agent/messages`: Process user message with optional `conversationId`. Automatically loads history, appends user message, executes agent loop, appends assistant message, and returns response with `conversationId`.

## 5. Observability & Auditability

The conversation system emits metadata-only observability events and metrics without logging raw message text or sensitive payload contents:
- Events: `ai.conversation.created`, `ai.conversation.message.persisted`, `ai.conversation.history.loaded`, `ai.conversation.deleted`.
- Metrics: `ai_conversations_created_total`, `ai_conversation_messages_persisted_total`, `ai_conversation_history_loaded_total`, `ai_conversations_deleted_total`.
