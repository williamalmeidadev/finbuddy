import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../../transaction/transaction.service';
import { TransactionSource } from '../../../../generated/prisma/enums';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';
import { CreateTransactionArgsDto } from '../../validation/tool-argument.dtos';

@Injectable()
export class CreateTransactionTool implements AgentTool {
  readonly name = 'create_transaction';
  readonly description =
    'Create a new financial transaction (income or expense) for the authenticated user.';
  readonly capability = AgentCapability.CREATE_TRANSACTION;
  readonly riskLevel = AgentToolRiskLevel.MEDIUM;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      accountId: {
        type: 'string',
        description: 'Account UUID associated with the transaction',
      },
      type: {
        type: 'string',
        enum: ['INCOME', 'EXPENSE'],
        description: 'Transaction type (INCOME or EXPENSE)',
      },
      amount: {
        type: 'number',
        minimum: 0.0001,
        maximum: 999999999999.9999,
        description: 'Positive transaction amount',
      },
      description: {
        type: 'string',
        description: 'Optional description of the transaction',
      },
      transactionAt: {
        type: 'string',
        description:
          'Transaction ISO date-time string (e.g. 2026-09-11T12:00:00Z)',
      },
      categoryId: {
        type: 'string',
        description: 'Optional category UUID associated with the transaction',
      },
    },
    required: ['accountId', 'type', 'amount', 'transactionAt'],
    additionalProperties: false,
  };

  constructor(private readonly transactionService: TransactionService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as CreateTransactionArgsDto;
      const result = await this.transactionService.create(context.userId, {
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        type: dto.type,
        amount: dto.amount,
        description: dto.description,
        source: TransactionSource.MANUAL,
        transactionAt: new Date(dto.transactionAt),
      });

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
            : 'Failed to create transaction',
      };
    }
  }
}
