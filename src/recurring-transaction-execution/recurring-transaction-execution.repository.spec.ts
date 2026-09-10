import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { RecurringTransactionExecutionRepository } from './recurring-transaction-execution.repository';

describe('RecurringTransactionExecutionRepository', () => {
  let repository: RecurringTransactionExecutionRepository;
  let prismaService: {
    recurringTransaction: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    transaction: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    account: {
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prismaService = {
      recurringTransaction: {
        findMany: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      account: {
        update: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(prismaService)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionExecutionRepository,
        {
          provide: DatabaseService,
          useValue: prismaService,
        },
      ],
    }).compile();

    repository = module.get<RecurringTransactionExecutionRepository>(
      RecurringTransactionExecutionRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  it('should find due recurring transactions', async () => {
    prismaService.recurringTransaction.findMany.mockResolvedValue([]);
    const res = await repository.findDueRecurringTransactions(
      'user-1',
      new Date('2026-01-01'),
    );
    expect(res).toEqual([]);
    expect(prismaService.recurringTransaction.findMany).toHaveBeenCalled();
  });
});
