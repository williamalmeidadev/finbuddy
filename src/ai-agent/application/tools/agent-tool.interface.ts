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

  execute(context: AgentToolContext, input: unknown): Promise<AgentToolResult>;
}
