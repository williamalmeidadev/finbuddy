import { Test, TestingModule } from '@nestjs/testing';
import { UpdateTransactionTool } from './update-transaction.tool';
import { TransactionService } from '../../../../transaction/transaction.service';
import { TransactionType } from '../../../../generated/prisma/enums';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('UpdateTransactionTool', () => {
  let tool: UpdateTransactionTool;
  let mockTransactionService: {
    update: jest.Mock;
  };

  beforeEach(async () => {
    mockTransactionService = {
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateTransactionTool,
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    tool = module.get<UpdateTransactionTool>(UpdateTransactionTool);
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('update_transaction');
    expect(tool.capability).toBe(AgentCapability.UPDATE_TRANSACTION);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.MEDIUM);
    expect(tool.readOnly).toBe(false);
    expect(tool.requiresConfirmation).toBe(true);
    expect(tool.inputSchema.additionalProperties).toBe(false);
  });

  it('should call TransactionService.update with transactionId, context.userId and dto arguments', async () => {
    const mockUpdatedTx = {
      id: 'tx-123',
      accountId: 'acc-123',
      type: TransactionType.EXPENSE,
      amount: 75,
      description: 'Updated Dinner',
      transactionAt: new Date('2026-09-11T18:00:00Z'),
    };
    mockTransactionService.update.mockResolvedValue(mockUpdatedTx);

    const result = await tool.execute(
      { userId: 'user-123' },
      {
        transactionId: 'tx-123',
        amount: 75,
        description: 'Updated Dinner',
        transactionAt: '2026-09-11T18:00:00Z',
      },
    );

    expect(mockTransactionService.update).toHaveBeenCalledWith(
      'tx-123',
      'user-123',
      {
        amount: 75,
        description: 'Updated Dinner',
        transactionAt: new Date('2026-09-11T18:00:00Z'),
      },
    );
    expect(result).toEqual({
      success: true,
      data: mockUpdatedTx,
    });
  });

  it('should catch TransactionService errors and return success false', async () => {
    mockTransactionService.update.mockRejectedValue(
      new Error('Transaction not found'),
    );

    const result = await tool.execute(
      { userId: 'user-123' },
      {
        transactionId: 'tx-bad',
        amount: 50,
      },
    );

    expect(result).toEqual({
      success: false,
      error: 'Transaction not found',
    });
  });
});
