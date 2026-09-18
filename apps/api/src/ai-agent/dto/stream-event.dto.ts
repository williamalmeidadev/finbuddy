export enum AiStreamEventType {
  TEXT_CHUNK = 'text_chunk',
  TOOL_START = 'tool_start',
  TOOL_COMPLETED = 'tool_completed',
  TOOL_FAILED = 'tool_failed',
  CONFIRMATION_REQUIRED = 'confirmation_required',
  DONE = 'done',
  ERROR = 'error',
}

export interface AiStreamEvent {
  type: AiStreamEventType;
  data: Record<string, unknown>;
  timestamp: string;
}
