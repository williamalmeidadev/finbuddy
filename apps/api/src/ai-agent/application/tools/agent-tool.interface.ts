import { AgentCapability } from '../authorization/agent-capability.enum';

export enum AgentToolRiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface AgentToolContext {
  userId: string;
  requestId?: string;
  aiRequestId?: string;
  /** Server-side ISO 8601 date-time injected at request time (e.g. "2026-09-14T11:42:00.000Z").
   *  Tools should use this as the default transactionAt/transferredAt when the user does not specify a date.
   *  Falls back to the current server time when not provided (e.g. in unit tests). */
  currentDateIso?: string;
}

export interface AgentToolResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: Record<string, any>;
  readonly parameters?: Record<string, any>;
  readonly capability: AgentCapability;
  readonly riskLevel: AgentToolRiskLevel;
  readonly readOnly: boolean;
  readonly requiresConfirmation?: boolean;

  execute(context: AgentToolContext, input: unknown): Promise<AgentToolResult>;
}
