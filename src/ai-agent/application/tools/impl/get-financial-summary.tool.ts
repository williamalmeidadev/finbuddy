import { Injectable } from '@nestjs/common';
import { FinancialSummaryService } from '../../../../financial-summary/financial-summary.service';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
} from '../agent-tool.interface';

@Injectable()
export class GetFinancialSummaryTool implements AgentTool {
  readonly name = 'get_financial_summary';
  readonly description =
    "Retrieve the authenticated user's financial summary for a calendar month.";
  readonly inputSchema = {
    type: 'object',
    properties: {
      month: {
        type: 'string',
        pattern: '^\\d{4}-(0[1-9]|1[0-2])$',
        description:
          'Calendar month in YYYY-MM format (defaults to current month)',
      },
    },
    required: [],
    additionalProperties: false,
  };

  constructor(
    private readonly financialSummaryService: FinancialSummaryService,
  ) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const params =
        input && typeof input === 'object' && !Array.isArray(input)
          ? (input as Record<string, any>)
          : {};

      const month =
        typeof params.month === 'string' && params.month.trim() !== ''
          ? params.month.trim()
          : undefined;

      const summary = await this.financialSummaryService.getSummary(
        context.userId,
        { month },
      );

      return { success: true, data: summary };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve financial summary',
      };
    }
  }
}
