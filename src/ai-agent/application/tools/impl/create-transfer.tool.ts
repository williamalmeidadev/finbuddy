import { Injectable } from '@nestjs/common';
import { TransferService } from '../../../../transfer/transfer.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';
import { CreateTransferArgsDto } from '../../validation/tool-argument.dtos';

@Injectable()
export class CreateTransferTool implements AgentTool {
  readonly name = 'create_transfer';
  readonly description =
    'Create a financial transfer moving funds between two accounts belonging to the authenticated user.';
  readonly capability = AgentCapability.CREATE_TRANSFER;
  readonly riskLevel = AgentToolRiskLevel.HIGH;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      fromAccountId: {
        type: 'string',
        description: 'Source account UUID',
      },
      toAccountId: {
        type: 'string',
        description: 'Destination account UUID',
      },
      amount: {
        type: 'number',
        minimum: 0.0001,
        maximum: 999999999999.9999,
        description: 'Positive transfer amount',
      },
      transactionAt: {
        type: 'string',
        description:
          'Transfer ISO date-time string (e.g. 2026-09-13T15:30:00Z)',
      },
    },
    required: ['fromAccountId', 'toAccountId', 'amount', 'transactionAt'],
    additionalProperties: false,
  };

  constructor(private readonly transferService: TransferService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as CreateTransferArgsDto;
      const result = await this.transferService.create(context.userId, {
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        amount: dto.amount,
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
          error instanceof Error ? error.message : 'Failed to create transfer',
      };
    }
  }
}
