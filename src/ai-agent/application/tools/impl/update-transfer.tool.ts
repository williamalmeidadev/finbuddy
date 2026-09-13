import { Injectable } from '@nestjs/common';
import { TransferService } from '../../../../transfer/transfer.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';
import { UpdateTransferArgsDto } from '../../validation/tool-argument.dtos';

@Injectable()
export class UpdateTransferTool implements AgentTool {
  readonly name = 'update_transfer';
  readonly description =
    'Update an existing financial transfer between two accounts belonging to the authenticated user. ' +
    'The transfer remains one atomic financial unit: the source account, destination account, ' +
    'and both linked SYSTEM transactions are synchronized together. ' +
    'Confirmation is always required before any financial mutation is applied.';
  readonly capability = AgentCapability.UPDATE_TRANSFER;
  readonly riskLevel = AgentToolRiskLevel.HIGH;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      transferId: {
        type: 'string',
        description: 'UUID of the transfer to update',
      },
      amount: {
        type: 'number',
        minimum: 0.0001,
        maximum: 999999999999.9999,
        description: 'Optional updated positive transfer amount',
      },
      transactionAt: {
        type: 'string',
        description:
          'Optional updated transfer ISO date-time string (e.g. 2026-09-13T15:30:00Z)',
      },
      fromAccountId: {
        type: 'string',
        description: 'Optional updated source account UUID',
      },
      toAccountId: {
        type: 'string',
        description: 'Optional updated destination account UUID',
      },
    },
    required: ['transferId'],
    additionalProperties: false,
  };

  constructor(private readonly transferService: TransferService) {}

  async execute(
    context: AgentToolContext,
    input: unknown,
  ): Promise<AgentToolResult> {
    try {
      const dto = input as UpdateTransferArgsDto;
      const result = await this.transferService.update(
        dto.transferId,
        context.userId,
        {
          ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
          ...(dto.transactionAt
            ? { transactionAt: new Date(dto.transactionAt) }
            : {}),
          ...(dto.fromAccountId !== undefined
            ? { fromAccountId: dto.fromAccountId }
            : {}),
          ...(dto.toAccountId !== undefined
            ? { toAccountId: dto.toAccountId }
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
          error instanceof Error ? error.message : 'Failed to update transfer',
      };
    }
  }
}
