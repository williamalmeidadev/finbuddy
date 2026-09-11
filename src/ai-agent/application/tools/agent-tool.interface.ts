export interface AgentToolContext {
  userId: string;
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

  execute(context: AgentToolContext, input: unknown): Promise<AgentToolResult>;
}
