import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransactionTool } from './create-transaction.tool';
import { TransactionService } from '../../../../transaction/transaction.service';
import {
  TransactionSource,
  TransactionType,
} from '../../../../generated/prisma/enums';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('CreateTransactionTool', () => {
  let tool: CreateTransactionTool;
  let mockTransactionService: {
    create: jest.Mock;
  };

  beforeEach(async () => {
    mockTransactionService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransactionTool,
        { provide: TransactionService, useValue: mockTransactionService },
      ],
    }).compile();

    tool = module.get<CreateTransactionTool>(CreateTransactionTool);
  });

  it('should have correct metadata', () => {
    expect(tool.name).toBe('create_transaction');
    expect(tool.capability).toBe(AgentCapability.CREATE_TRANSACTION);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.MEDIUM);
    expect(tool.readOnly).toBe(false);
    expect(tool.inputSchema.additionalProperties).toBe(false);
  });

  it('should call TransactionService.create with context.userId and dto arguments', async () => {
    const mockCreatedTx = {
      id: 'tx-123',
      accountId: 'acc-123',
      type: TransactionType.EXPENSE,
      amount: 50,
      description: 'Lunch',
      transactionAt: new Date('2026-09-11T12:00:00Z'),
    };
    mockTransactionService.create.mockResolvedValue(mockCreatedTx);

    const result = await tool.execute(
      { userId: 'user-123' },
      {
        accountId: 'acc-123',
        type: 'EXPENSE',
        amount: 50,
        description: 'Lunch',
        transactionAt: '2026-09-11T12:00:00Z',
      },
    );

    expect(mockTransactionService.create).toHaveBeenCalledWith('user-123', {
      accountId: 'acc-123',
      categoryId: undefined,
      type: TransactionType.EXPENSE,
      amount: 50,
      description: 'Lunch',
      source: TransactionSource.MANUAL,
      transactionAt: new Date('2026-09-11T12:00:00Z'),
    });
    expect(result).toEqual({
      success: true,
      data: mockCreatedTx,
    });
  });

  it('should catch TransactionService errors and return success false', async () => {
    mockTransactionService.create.mockRejectedValue(
      new Error('Account not found'),
    );

    const result = await tool.execute(
      { userId: 'user-123' },
      {
        accountId: 'acc-bad',
        type: 'EXPENSE',
        amount: 50,
        transactionAt: '2026-09-11T12:00:00Z',
      },
    );

    expect(result).toEqual({
      success: false,
      error: 'Account not found',
    });
  });
});
