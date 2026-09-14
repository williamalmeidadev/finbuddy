import { Injectable } from '@nestjs/common';
import { CategoryService } from '../../../../category/category.service';
import { CategoryType } from '../../../../generated/prisma/enums';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';

@Injectable()
export class GetCategoriesTool implements AgentTool {
  readonly name = 'get_categories';
  readonly description =
    "Retrieve the authenticated user's financial categories.";
  readonly capability = AgentCapability.READ_CATEGORIES;
  readonly riskLevel = AgentToolRiskLevel.LOW;
  readonly readOnly = true;
  readonly inputSchema = {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['INCOME', 'EXPENSE'],
        description: 'Optional category type filter (INCOME or EXPENSE)',
      },
    },
    required: [],
    additionalProperties: false,
  };

  constructor(private readonly categoryService: CategoryService) {}

  async execute(
    context: AgentToolContext,
    input?: unknown,
  ): Promise<AgentToolResult> {
    try {
      const params =
        input && typeof input === 'object' && !Array.isArray(input)
          ? (input as Record<string, any>)
          : {};
      const type =
        params.type === 'INCOME' || params.type === 'EXPENSE'
          ? (params.type as CategoryType)
          : undefined;

      const categories = await this.categoryService.findByUserId(
        context.userId,
        type ? { type } : undefined,
      );

      const sanitized = categories.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon,
        color: c.color,
        isActive: c.isActive,
      }));

      return { success: true, data: sanitized };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve categories',
      };
    }
  }
}
