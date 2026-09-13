import { Injectable } from '@nestjs/common';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';
import { SaveMemoryArgsDto } from '../../validation/tool-argument.dtos';
import { AiMemoryService } from '../../memory/ai-memory.service';

@Injectable()
export class SaveMemoryTool implements AgentTool {
  readonly name = 'save_memory';
  readonly description =
    'Save or update a user preference, financial goal, or general context memory entry for the authenticated user.';
  readonly capability = AgentCapability.MANAGE_MEMORY;
  readonly riskLevel = AgentToolRiskLevel.LOW;
  readonly readOnly = false;
  readonly requiresConfirmation = false;

  readonly inputSchema = {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['PREFERENCE', 'FINANCIAL_GOAL', 'GENERAL_CONTEXT'],
        description: 'Memory category/type',
      },
      key: {
        type: 'string',
        description:
          'Memory key (e.g. preferred_currency, preferred_language, monthly_savings_target, budgeting_style)',
      },
      value: {
        type: 'string',
        description: 'Memory value (e.g. BRL, pt-BR, 1000, monthly)',
      },
    },
    required: ['type', 'key', 'value'],
    additionalProperties: false,
  };

  constructor(private readonly memoryService: AiMemoryService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as SaveMemoryArgsDto;
      const memory = await this.memoryService.saveMemory(
        context.userId,
        dto.type,
        dto.key,
        dto.value,
        {
          requestId: context.requestId,
          aiRequestId: context.aiRequestId,
        },
      );

      return {
        success: true,
        data: {
          id: memory.id,
          type: memory.type,
          key: memory.key,
          value: memory.value,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save memory',
      };
    }
  }
}
