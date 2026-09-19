import { Injectable } from '@nestjs/common';
import { BudgetService } from '../../../../budget/budget.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';

export interface UpdateBudgetInput {
  budgetId: string;
  amount: number;
}

@Injectable()
export class UpdateBudgetTool implements AgentTool {
  readonly name = 'update_budget';
  readonly description =
    'Update the target amount of an existing monthly budget for the authenticated user.';
  readonly capability = AgentCapability.UPDATE_BUDGET;
  readonly riskLevel = AgentToolRiskLevel.MEDIUM;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      budgetId: {
        type: 'string',
        description: 'UUID of the budget record to update',
      },
      amount: {
        type: 'number',
        description:
          'Updated monthly target budget amount in BRL (must be positive)',
      },
    },
    required: ['budgetId', 'amount'],
    additionalProperties: false,
  };

  constructor(private readonly budgetService: BudgetService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as UpdateBudgetInput;
      const budget = await this.budgetService.update(
        dto.budgetId,
        context.userId,
        {
          amount: Number(dto.amount),
        },
      );

      return {
        success: true,
        data: budget,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to update budget',
      };
    }
  }
}
