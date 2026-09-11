export interface AgentToolContext {
  userId: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute(context: AgentToolContext, args: Record<string, any>): Promise<any>;
}
