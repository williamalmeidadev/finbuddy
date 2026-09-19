import { Injectable } from '@nestjs/common';
import { BudgetService } from '../../../../budget/budget.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';

export interface DeleteBudgetInput {
  budgetId: string;
}

@Injectable()
export class DeleteBudgetTool implements AgentTool {
  readonly name = 'delete_budget';
  readonly description =
    'Delete an existing monthly budget for the authenticated user.';
  readonly capability = AgentCapability.DELETE_BUDGET;
  readonly riskLevel = AgentToolRiskLevel.HIGH;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      budgetId: {
        type: 'string',
        description: 'UUID of the budget record to delete',
      },
    },
    required: ['budgetId'],
    additionalProperties: false,
  };

  constructor(private readonly budgetService: BudgetService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as DeleteBudgetInput;
      const budget = await this.budgetService.delete(
        dto.budgetId,
        context.userId,
      );

      return {
        success: true,
        data: budget,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to delete budget',
      };
    }
  }
}
