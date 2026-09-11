import { Injectable } from '@nestjs/common';
import { AgentTool } from './agent-tool.interface';

@Injectable()
export class AgentToolRegistryService {
  private readonly tools = new Map<string, AgentTool>();

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): any[] {
    return this.getTools().map((t) => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }
}
