import { Injectable } from '@nestjs/common';
import { BudgetService } from '../../../../budget/budget.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';

export interface CreateBudgetInput {
  categoryId: string;
  amount: number;
  month: string;
  categoryName?: string;
}

@Injectable()
export class CreateBudgetTool implements AgentTool {
  readonly name = 'create_budget';
  readonly description =
    'Create a monthly category expense budget for the authenticated user.';
  readonly capability = AgentCapability.CREATE_BUDGET;
  readonly riskLevel = AgentToolRiskLevel.MEDIUM;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'UUID of the target expense category',
      },
      amount: {
        type: 'number',
        description: 'Target monthly budget amount in BRL (must be positive)',
      },
      month: {
        type: 'string',
        description:
          'Target month in YYYY-MM or YYYY-MM-01 format (e.g. 2026-09)',
      },
      categoryName: {
        type: 'string',
        description:
          'Optional category name for UI display in confirmation card',
      },
    },
    required: ['categoryId', 'amount', 'month'],
    additionalProperties: false,
  };

  constructor(private readonly budgetService: BudgetService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as CreateBudgetInput;
      const budget = await this.budgetService.create(context.userId, {
        categoryId: dto.categoryId,
        amount: Number(dto.amount),
        month: String(dto.month),
      });

      return {
        success: true,
        data: budget,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to create budget',
      };
    }
  }
}
