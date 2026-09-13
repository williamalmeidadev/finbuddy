import { Test, TestingModule } from '@nestjs/testing';
import { UpdateTransferTool } from './update-transfer.tool';
import { TransferService } from '../../../../transfer/transfer.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('UpdateTransferTool', () => {
  let tool: UpdateTransferTool;
  let transferService: jest.Mocked<Partial<TransferService>>;

  const TRANSFER_ID = 'tr-eval-1111-1111-1111';
  const USER_ID = 'user-eval-a-1111-1111-1111';
  const ACCOUNT_A1 = 'a1111111-1111-4111-8111-111111111111';
  const ACCOUNT_A2 = 'a2222222-2222-4222-8222-222222222222';

  beforeEach(async () => {
    transferService = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateTransferTool,
        {
          provide: TransferService,
          useValue: transferService,
        },
      ],
    }).compile();

    tool = module.get<UpdateTransferTool>(UpdateTransferTool);
  });

  it('should have metadata configured for HIGH-risk write action requiring confirmation', () => {
    expect(tool.name).toBe('update_transfer');
    expect(tool.capability).toBe(AgentCapability.UPDATE_TRANSFER);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.HIGH);
    expect(tool.readOnly).toBe(false);
    expect(tool.requiresConfirmation).toBe(true);
  });

  it('should call TransferService.update with context.userId and return success result for amount update', async () => {
    const mockTransfer = {
      id: TRANSFER_ID,
      fromAccountId: ACCOUNT_A1,
      toAccountId: ACCOUNT_A2,
      amount: 150.0,
      transactionAt: new Date('2026-09-13T15:30:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (transferService.update as jest.Mock).mockResolvedValue(mockTransfer);

    const result = await tool.execute(
      { userId: USER_ID },
      {
        transferId: TRANSFER_ID,
        amount: 150.0,
      },
    );

    expect(transferService.update).toHaveBeenCalledWith(
      TRANSFER_ID,
      USER_ID,
      { amount: 150.0 },
    );
    expect(result).toEqual({ success: true, data: mockTransfer });
  });

  it('should call TransferService.update for transactionAt update', async () => {
    const newDate = '2026-10-01T10:00:00.000Z';
    const mockTransfer = {
      id: TRANSFER_ID,
      fromAccountId: ACCOUNT_A1,
      toAccountId: ACCOUNT_A2,
      amount: 100.0,
      transactionAt: new Date(newDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (transferService.update as jest.Mock).mockResolvedValue(mockTransfer);

    const result = await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID, transactionAt: newDate },
    );

    expect(transferService.update).toHaveBeenCalledWith(
      TRANSFER_ID,
      USER_ID,
      { transactionAt: new Date(newDate) },
    );
    expect(result.success).toBe(true);
  });

  it('should call TransferService.update for account change', async () => {
    const mockTransfer = {
      id: TRANSFER_ID,
      fromAccountId: ACCOUNT_A2,
      toAccountId: ACCOUNT_A1,
      amount: 100.0,
      transactionAt: new Date('2026-09-13T15:30:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    (transferService.update as jest.Mock).mockResolvedValue(mockTransfer);

    const result = await tool.execute(
      { userId: USER_ID },
      {
        transferId: TRANSFER_ID,
        fromAccountId: ACCOUNT_A2,
        toAccountId: ACCOUNT_A1,
      },
    );

    expect(transferService.update).toHaveBeenCalledWith(
      TRANSFER_ID,
      USER_ID,
      { fromAccountId: ACCOUNT_A2, toAccountId: ACCOUNT_A1 },
    );
    expect(result.success).toBe(true);
  });

  it('should handle NotFoundException from service gracefully', async () => {
    (transferService.update as jest.Mock).mockRejectedValue(
      new NotFoundException('Transfer not found'),
    );

    const result = await tool.execute(
      { userId: USER_ID },
      { transferId: 'non-existent-uuid', amount: 100.0 },
    );

    expect(result).toEqual({ success: false, error: 'Transfer not found' });
  });

  it('should handle BadRequestException for insufficient balance', async () => {
    (transferService.update as jest.Mock).mockRejectedValue(
      new BadRequestException('Insufficient balance for transfer'),
    );

    const result = await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID, amount: 999999.0 },
    );

    expect(result).toEqual({
      success: false,
      error: 'Insufficient balance for transfer',
    });
  });

  it('should handle unknown errors with a generic message', async () => {
    (transferService.update as jest.Mock).mockRejectedValue('unknown error');

    const result = await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID, amount: 50.0 },
    );

    expect(result).toEqual({
      success: false,
      error: 'Failed to update transfer',
    });
  });

  it('should not pass userId to transferService.update (userId comes only from context)', async () => {
    (transferService.update as jest.Mock).mockResolvedValue({
      id: TRANSFER_ID,
      fromAccountId: ACCOUNT_A1,
      toAccountId: ACCOUNT_A2,
      amount: 50.0,
      transactionAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await tool.execute(
      { userId: USER_ID },
      { transferId: TRANSFER_ID, amount: 50.0 },
    );

    const callArgs = (transferService.update as jest.Mock).mock.calls[0];
    // transferId is first arg, userId is second (from context), dto is third
    expect(callArgs[0]).toBe(TRANSFER_ID);
    expect(callArgs[1]).toBe(USER_ID);
    // The dto must NOT contain a userId field
    expect(callArgs[2]).not.toHaveProperty('userId');
  });
});
