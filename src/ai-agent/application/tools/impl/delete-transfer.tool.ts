import { Injectable } from '@nestjs/common';
import { TransferService } from '../../../../transfer/transfer.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';
import { DeleteTransferArgsDto } from '../../validation/tool-argument.dtos';

@Injectable()
export class DeleteTransferTool implements AgentTool {
  readonly name = 'delete_transfer';
  readonly description =
    'Delete an existing financial transfer between two accounts belonging to the authenticated user. ' +
    'The transfer is deleted as one atomic financial unit: the Transfer record and both linked SYSTEM transactions are removed, ' +
    'and the original balances of both accounts are restored. ' +
    'Confirmation is always required before any financial deletion is executed.';
  readonly capability = AgentCapability.DELETE_TRANSFER;
  readonly riskLevel = AgentToolRiskLevel.HIGH;
  readonly readOnly = false;
  readonly requiresConfirmation = true;

  readonly inputSchema = {
    type: 'object',
    properties: {
      transferId: {
        type: 'string',
        description: 'UUID of the transfer to delete',
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
      const dto = input as DeleteTransferArgsDto;
      const result = await this.transferService.delete(
        dto.transferId,
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
          error instanceof Error ? error.message : 'Failed to delete transfer',
      };
    }
  }
}
