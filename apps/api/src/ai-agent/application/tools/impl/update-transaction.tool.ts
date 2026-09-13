import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../../transaction/transaction.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';
import { UpdateTransactionArgsDto } from '../../validation/tool-argument.dtos';

@Injectable()
export class UpdateTransactionTool implements AgentTool {
  readonly name = 'update_transaction';
  readonly description =
    'Update an existing financial transaction (income or expense) for the authenticated user.';
  readonly capability = AgentCapability.UPDATE_TRANSACTION;
  readonly riskLevel = AgentToolRiskLevel.MEDIUM;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      transactionId: {
        type: 'string',
        description: 'UUID of the transaction to update',
      },
      accountId: {
        type: 'string',
        description: 'Optional updated account UUID',
      },
      categoryId: {
        type: 'string',
        description: 'Optional updated category UUID',
      },
      type: {
        type: 'string',
        enum: ['INCOME', 'EXPENSE'],
        description: 'Optional updated transaction type (INCOME or EXPENSE)',
      },
      amount: {
        type: 'number',
        minimum: 0.0001,
        maximum: 999999999999.9999,
        description: 'Optional updated positive transaction amount',
      },
      description: {
        type: 'string',
        description: 'Optional updated description of the transaction',
      },
      transactionAt: {
        type: 'string',
        description:
          'Optional updated transaction ISO date-time string (e.g. 2026-09-11T12:00:00Z)',
      },
    },
    required: ['transactionId'],
    additionalProperties: false,
  };

  constructor(private readonly transactionService: TransactionService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as UpdateTransactionArgsDto;
      const result = await this.transactionService.update(
        dto.transactionId,
        context.userId,
        {
          ...(dto.accountId !== undefined ? { accountId: dto.accountId } : {}),
          ...(dto.categoryId !== undefined
            ? { categoryId: dto.categoryId }
            : {}),
          ...(dto.type ? { type: dto.type } : {}),
          ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description }
            : {}),
          ...(dto.transactionAt
            ? { transactionAt: new Date(dto.transactionAt) }
            : {}),
        },
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to update transaction',
      };
    }
  }
}
