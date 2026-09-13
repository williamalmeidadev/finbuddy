export interface AiAgentEvent {
  event: string;
  requestId: string;
  aiRequestId?: string;
  userId?: string;
  toolName?: string;
  durationMs?: number;
  success?: boolean;
  errorCode?: string;
  operation?: string;
  riskLevel?: string;
  confirmationId?: string;
  meta?: Record<string, unknown>;
}

export const AiEventName = {
  REQUEST_STARTED: 'ai.request.started',
  REQUEST_COMPLETED: 'ai.request.completed',
  REQUEST_FAILED: 'ai.request.failed',

  LLM_STARTED: 'ai.llm.started',
  LLM_COMPLETED: 'ai.llm.completed',
  LLM_FAILED: 'ai.llm.failed',

  TOOL_REQUESTED: 'ai.tool.requested',
  TOOL_VALIDATION_FAILED: 'ai.tool.validation_failed',
  TOOL_AUTHORIZATION_DENIED: 'ai.tool.authorization_denied',
  TOOL_STARTED: 'ai.tool.started',
  TOOL_COMPLETED: 'ai.tool.completed',
  TOOL_FAILED: 'ai.tool.failed',

  CONFIRMATION_CREATED: 'ai.confirmation.created',
  CONFIRMATION_CONFIRMED: 'ai.confirmation.confirmed',
  CONFIRMATION_CANCELLED: 'ai.confirmation.cancelled',
  CONFIRMATION_EXPIRED: 'ai.confirmation.expired',
  CONFIRMATION_REJECTED: 'ai.confirmation.rejected',
} as const;

export const AiErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  CONFIRMATION_REQUIRED: 'CONFIRMATION_REQUIRED',
  CONFIRMATION_EXPIRED: 'CONFIRMATION_EXPIRED',
  CONFIRMATION_CANCELLED: 'CONFIRMATION_CANCELLED',
  CONFIRMATION_ALREADY_CONSUMED: 'CONFIRMATION_ALREADY_CONSUMED',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_ERROR: 'TOOL_EXECUTION_ERROR',
  LLM_ERROR: 'LLM_ERROR',
  TIMEOUT: 'TIMEOUT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
