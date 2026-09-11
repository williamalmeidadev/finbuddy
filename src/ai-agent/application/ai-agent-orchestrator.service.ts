import { Injectable } from '@nestjs/common';
import { OpenAIClient } from '../infrastructure/openai/openai.client';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { FINBUDDY_AGENT_INSTRUCTIONS } from './prompts/finbuddy-agent.instructions';
import { AgentResponse } from '../domain/agent-response';

@Injectable()
export class AiAgentOrchestratorService {
  constructor(
    private readonly openAiClient: OpenAIClient,
    private readonly toolRegistry: AgentToolRegistryService,
  ) {}

  async processUserMessage(
    userId: string,
    userMessage: string,
  ): Promise<AgentResponse> {
    const tools = this.toolRegistry.getToolDefinitions();
    const textOutput = await this.openAiClient.createResponse({
      instructions: FINBUDDY_AGENT_INSTRUCTIONS,
      input: userMessage,
      tools: tools.length > 0 ? tools : undefined,
    });

    return new AgentResponse(textOutput);
  }
}
