import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../../transaction/transaction.service';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
} from '../agent-tool.interface';

@Injectable()
export class GetTransactionsTool implements AgentTool {
  readonly name = 'get_transactions';
  readonly description =
    "Retrieve the authenticated user's transaction history using optional filters.";
  readonly inputSchema = {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'Optional account UUID filter',
      },
      limit: {
        type: 'integer',
        minimum: 1,
        maximum: 100,
        description: 'Maximum number of transactions to return (1-100)',
      },
      offset: {
        type: 'integer',
        minimum: 0,
        description: 'Number of transactions to skip for pagination',
      },
    },
    required: [],
    additionalProperties: false,
  };

  constructor(private readonly transactionService: TransactionService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const params =
        input && typeof input === 'object' && !Array.isArray(input)
          ? (input as Record<string, any>)
          : {};

      const accountId =
        typeof params.accountId === 'string' && params.accountId.trim() !== ''
          ? params.accountId.trim()
          : undefined;

      const limit =
        typeof params.limit === 'number' && Number.isInteger(params.limit)
          ? Math.min(Math.max(params.limit, 1), 100)
          : undefined;

      const offset =
        typeof params.offset === 'number' && Number.isInteger(params.offset)
          ? Math.max(params.offset, 0)
          : undefined;

      const transactions = await this.transactionService.findByUserId(
        context.userId,
        {
          accountId,
          limit,
          offset,
        },
      );

      const sanitized = transactions.map((t) => ({
        id: t.id,
        accountId: t.accountId,
        categoryId: t.categoryId,
        type: t.type,
        amount: t.amount,
        description: t.description,
        source: t.source,
        transactionAt: t.transactionAt,
      }));

      return { success: true, data: sanitized };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve transactions',
      };
    }
  }
}
