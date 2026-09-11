import { Test, TestingModule } from '@nestjs/testing';
import { GetTransactionsTool } from './get-transactions.tool';
import { TransactionService } from '../../../../transaction/transaction.service';
import {
  TransactionSource,
  TransactionType,
} from '../../../../generated/prisma/enums';
import { NotFoundException } from '@nestjs/common';

describe('GetTransactionsTool', () => {
  let tool: GetTransactionsTool;

  const mockTransactionService = {
    findByUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetTransactionsTool,
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    tool = module.get<GetTransactionsTool>(GetTransactionsTool);
  });

  it('should be defined with name and schema', () => {
    expect(tool.name).toBe('get_transactions');
    expect(tool.inputSchema.additionalProperties).toBe(false);
  });

  it('should pass authenticated userId and query filters to service', async () => {
    const mockTx = [
      {
        id: 'tx-1',
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 50.0,
        description: 'Supermarket',
        source: TransactionSource.MANUAL,
        transactionAt: new Date('2026-03-01'),
      },
    ];
    mockTransactionService.findByUserId.mockResolvedValue(mockTx);

    const result = await tool.execute(
      { userId: 'user-123' },
      { accountId: 'acc-1', limit: 10, offset: 0 },
    );

    expect(mockTransactionService.findByUserId).toHaveBeenCalledWith(
      'user-123',
      {
        accountId: 'acc-1',
        limit: 10,
        offset: 0,
      },
    );
    expect(result).toEqual({
      success: true,
      data: mockTx,
    });
  });

  it('should enforce limit bounds (1 to 100)', async () => {
    mockTransactionService.findByUserId.mockResolvedValue([]);

    await tool.execute({ userId: 'user-123' }, { limit: 500 });
    expect(mockTransactionService.findByUserId).toHaveBeenCalledWith(
      'user-123',
      {
        accountId: undefined,
        limit: 100,
        offset: undefined,
      },
    );

    await tool.execute({ userId: 'user-123' }, { limit: -5 });
    expect(mockTransactionService.findByUserId).toHaveBeenCalledWith(
      'user-123',
      {
        accountId: undefined,
        limit: 1,
        offset: undefined,
      },
    );
  });

  it('should catch ownership/not found exceptions cleanly', async () => {
    mockTransactionService.findByUserId.mockRejectedValue(
      new NotFoundException('Account not found'),
    );

    const result = await tool.execute(
      { userId: 'user-123' },
      { accountId: 'other-user-acc' },
    );

    expect(result).toEqual({
      success: false,
      error: 'Account not found',
    });
  });
});
