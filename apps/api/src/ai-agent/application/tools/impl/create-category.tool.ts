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

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string;
  color?: string;
}

@Injectable()
export class CreateCategoryTool implements AgentTool {
  readonly name = 'create_category';
  readonly description =
    'Create a new financial category for the authenticated user.';
  readonly capability = AgentCapability.CREATE_CATEGORY;
  readonly riskLevel = AgentToolRiskLevel.MEDIUM;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Category name (e.g. Mercado, Alimentação, Transporte)',
      },
      type: {
        type: 'string',
        enum: ['INCOME', 'EXPENSE'],
        description: 'Category type (INCOME or EXPENSE)',
      },
      icon: {
        type: 'string',
        description:
          'Optional icon identifier for category (e.g. ShoppingCart, Utensils, Car)',
      },
      color: {
        type: 'string',
        description: 'Optional hex color code for category (e.g. #EF4444)',
      },
    },
    required: ['name', 'type'],
    additionalProperties: false,
  };

  constructor(private readonly categoryService: CategoryService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as CreateCategoryInput;
      const category = await this.categoryService.create(context.userId, {
        name: String(dto.name).trim(),
        type: dto.type,
        icon: dto.icon || 'Folder',
        color: dto.color || '#64748B',
      });

      return {
        success: true,
        data: category,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create category',
      };
    }
  }
}
