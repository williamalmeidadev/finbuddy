import { Injectable } from '@nestjs/common';
import { BudgetService } from '../../../../budget/budget.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';

@Injectable()
export class GetBudgetsTool implements AgentTool {
  readonly name = 'get_budgets';
  readonly description =
    "Retrieve the authenticated user's budgets and current spending information.";
  readonly capability = AgentCapability.READ_BUDGETS;
  readonly riskLevel = AgentToolRiskLevel.LOW;
  readonly readOnly = true;
  readonly inputSchema = {
    type: 'object',
    properties: {
      categoryId: {
        type: 'string',
        description: 'Optional category UUID filter',
      },
      month: {
        type: 'string',
        pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
        description: 'Optional target month in YYYY-MM format',
      },
    },
    required: [],
    additionalProperties: false,
  };

  constructor(private readonly budgetService: BudgetService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const params =
        input && typeof input === 'object' && !Array.isArray(input)
          ? (input as Record<string, any>)
          : {};

      const categoryId =
        typeof params.categoryId === 'string' && params.categoryId.trim() !== ''
          ? params.categoryId.trim()
          : undefined;

      const month =
        typeof params.month === 'string' && params.month.trim() !== ''
          ? params.month.trim()
          : undefined;

      const budgets = await this.budgetService.findByUserId(context.userId, {
        categoryId,
        month,
      });

      const sanitized = budgets.map((b) => ({
        id: b.id,
        categoryId: b.categoryId,
        month: b.month,
        amount: b.amount,
        spent: b.spent,
        remaining: b.remaining,
        percentageUsed: b.percentageUsed,
      }));

      return { success: true, data: sanitized };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to retrieve budgets',
      };
    }
  }
}
