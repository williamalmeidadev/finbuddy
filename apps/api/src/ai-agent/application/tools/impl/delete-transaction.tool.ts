import { Injectable } from '@nestjs/common';
import { TransactionService } from '../../../../transaction/transaction.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';
import { DeleteTransactionArgsDto } from '../../validation/tool-argument.dtos';

@Injectable()
export class DeleteTransactionTool implements AgentTool {
  readonly name = 'delete_transaction';
  readonly description =
    'Delete an existing financial transaction for the authenticated user.';
  readonly capability = AgentCapability.DELETE_TRANSACTION;
  readonly riskLevel = AgentToolRiskLevel.HIGH;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      transactionId: {
        type: 'string',
        description: 'UUID of the transaction to delete',
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
      const dto = input as DeleteTransactionArgsDto;
      const result = await this.transactionService.delete(
        dto.transactionId,
        context.userId,
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
            : 'Failed to delete transaction',
      };
    }
  }
}
