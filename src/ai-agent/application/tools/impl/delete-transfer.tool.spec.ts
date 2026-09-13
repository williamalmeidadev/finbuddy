import { Test, TestingModule } from '@nestjs/testing';
import { DeleteTransferTool } from './delete-transfer.tool';
import { TransferService } from '../../../../transfer/transfer.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('DeleteTransferTool', () => {
  let tool: DeleteTransferTool;
  let transferService: jest.Mocked<Partial<TransferService>>;

  const TRANSFER_ID = 'f4444444-4444-4444-8444-444444444444';
  const USER_ID = 'user-eval-a-1111-1111-1111';

  beforeEach(async () => {
    transferService = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTransferTool,
        {
          provide: TransferService,
          useValue: transferService,
        },
      ],
    }).compile();

    tool = module.get<DeleteTransferTool>(DeleteTransferTool);
  });

  it('should have metadata configured for HIGH-risk write action requiring confirmation', () => {
    expect(tool.name).toBe('delete_transfer');
    expect(tool.capability).toBe(AgentCapability.DELETE_TRANSFER);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.HIGH);
    expect(tool.readOnly).toBe(false);
    expect(tool.requiresConfirmation).toBe(true);
  });

  it('should call TransferService.delete with context.userId and return success result', async () => {
    const mockDeletedTransfer = {
      id: TRANSFER_ID,
      fromAccountId: 'a1111111-1111-4111-8111-111111111111',
      toAccountId: 'a2222222-2222-4222-8222-222222222222',
      amount: 100.0,
      transactionAt: new Date('2026-09-13T15:30:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (transferService.delete as jest.Mock).mockResolvedValue(
      mockDeletedTransfer,
    );

    const result = await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID },
    );

    expect(transferService.delete).toHaveBeenCalledWith(TRANSFER_ID, USER_ID);
    expect(result).toEqual({ success: true, data: mockDeletedTransfer });
  });

  it('should handle NotFoundException from service gracefully', async () => {
    (transferService.delete as jest.Mock).mockRejectedValue(
      new NotFoundException('Transfer not found'),
    );

    const result = await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID },
    );

    expect(result).toEqual({ success: false, error: 'Transfer not found' });
  });

  it('should handle BadRequestException from service gracefully', async () => {
    (transferService.delete as jest.Mock).mockRejectedValue(
      new BadRequestException('Cannot delete transfer'),
    );

    const result = await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID },
    );

    expect(result).toEqual({ success: false, error: 'Cannot delete transfer' });
  });

  it('should handle unknown errors with generic error message', async () => {
    (transferService.delete as jest.Mock).mockRejectedValue('unknown');

    const result = await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID },
    );

    expect(result).toEqual({
      success: false,
      error: 'Failed to delete transfer',
    });
  });

  it('should source userId strictly from context and never from input object', async () => {
    (transferService.delete as jest.Mock).mockResolvedValue({
      id: TRANSFER_ID,
      fromAccountId: 'a1111111-1111-4111-8111-111111111111',
      toAccountId: 'a2222222-2222-4222-8222-222222222222',
      amount: 100.0,
      transactionAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID, userId: 'malicious-user-id' } as any,
    );

    expect(transferService.delete).toHaveBeenCalledWith(TRANSFER_ID, USER_ID);
  });
});
