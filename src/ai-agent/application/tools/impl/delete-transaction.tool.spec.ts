import { Test, TestingModule } from '@nestjs/testing';
import { DeleteTransactionTool } from './delete-transaction.tool';
import { TransactionService } from '../../../../transaction/transaction.service';
import { TransactionType } from '../../../../generated/prisma/enums';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('DeleteTransactionTool', () => {
  let tool: DeleteTransactionTool;
  let mockTransactionService: {
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockTransactionService = {
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteTransactionTool,
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    tool = module.get<DeleteTransactionTool>(DeleteTransactionTool);
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('delete_transaction');
    expect(tool.capability).toBe(AgentCapability.DELETE_TRANSACTION);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.HIGH);
    expect(tool.readOnly).toBe(false);
    expect(tool.requiresConfirmation).toBe(true);
    expect(tool.inputSchema.additionalProperties).toBe(false);
  });

  it('should call TransactionService.delete with transactionId and context.userId', async () => {
    const mockDeletedTx = {
      id: 'f1111111-1111-4111-8111-111111111111',
      accountId: 'acc-123',
      type: TransactionType.EXPENSE,
      amount: 100,
      description: 'Supermarket',
      transactionAt: new Date('2026-09-11T12:00:00Z'),
    };
    mockTransactionService.delete.mockResolvedValue(mockDeletedTx);

    const result = await tool.execute(
      { userId: 'user-123' },
      {
        transactionId: 'f1111111-1111-4111-8111-111111111111',
      },
    );

    expect(mockTransactionService.delete).toHaveBeenCalledWith(
      'f1111111-1111-4111-8111-111111111111',
      'user-123',
    );
    expect(result).toEqual({
      success: true,
      data: mockDeletedTx,
    });
  });

  it('should catch TransactionService errors and return success false', async () => {
    mockTransactionService.delete.mockRejectedValue(
      new Error('Transaction not found'),
    );

    const result = await tool.execute(
      { userId: 'user-123' },
      {
        transactionId: 'f9999999-9999-4999-8999-999999999999',
      },
    );

    expect(result).toEqual({
      success: false,
      error: 'Transaction not found',
    });
  });
});
