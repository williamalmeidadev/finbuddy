import { Test, TestingModule } from '@nestjs/testing';
import { AccountRepository } from '../account/account.repository';
import { CategoryRepository } from '../category/category.repository';
import {
  CategoryType,
  RecurrenceFrequency,
  TransactionType,
} from '../generated/prisma/enums';
import { RecurringTransactionModel as RecurringTransaction } from '../generated/prisma/models/RecurringTransaction';
import { RecurringTransactionExecutionRepository } from './recurring-transaction-execution.repository';
import { RecurringTransactionExecutionService } from './recurring-transaction-execution.service';

describe('RecurringTransactionExecutionService', () => {
  let service: RecurringTransactionExecutionService;
  let repository: {
    findDueRecurringTransactions: jest.Mock;
    processOccurrence: jest.Mock;
  };
  let accountRepository: {
    findByIdAndUserId: jest.Mock;
  };
  let categoryRepository: {
    findByIdAndUserId: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    repository = {
      findDueRecurringTransactions: jest.fn(),
      processOccurrence: jest.fn(),
    };
    accountRepository = {
      findByIdAndUserId: jest.fn(),
    };
    categoryRepository = {
      findByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionExecutionService,
        {
          provide: RecurringTransactionExecutionRepository,
          useValue: repository,
        },
        {
          provide: AccountRepository,
          useValue: accountRepository,
        },
        {
          provide: CategoryRepository,
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = module.get<RecurringTransactionExecutionService>(
      RecurringTransactionExecutionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should process due recurring transactions and return summary', async () => {
      const recurring: Partial<RecurringTransaction> = {
        id: 'rec-1',
        userId,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.INCOME,
        amount: '1000' as any,
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: new Date('2026-01-01'),
        nextOccurrence: new Date('2026-01-01'),
        isActive: true,
      };

      repository.findDueRecurringTransactions.mockResolvedValue([recurring]);
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        isActive: true,
        type: CategoryType.INCOME,
      });

      repository.processOccurrence.mockResolvedValueOnce({
        created: true,
        skipped: false,
        deactivated: false,
        updatedRecurring: {
          ...recurring,
          nextOccurrence: new Date('2026-02-01'),
        },
      });

      const res = await service.execute(userId, { until: '2026-01-15' });

      expect(res.processed).toBe(1);
      expect(res.created).toBe(1);
      expect(res.skipped).toBe(0);
      expect(res.deactivated).toBe(0);
    });

    it('should skip recurring transaction if account is inactive', async () => {
      const recurring: Partial<RecurringTransaction> = {
        id: 'rec-1',
        userId,
        accountId: 'acc-1',
        nextOccurrence: new Date('2026-01-01'),
        isActive: true,
      };

      repository.findDueRecurringTransactions.mockResolvedValue([recurring]);
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: false,
      });

      const res = await service.execute(userId, { until: '2026-01-15' });

      expect(res.processed).toBe(0);
      expect(res.created).toBe(0);
      expect(repository.processOccurrence).not.toHaveBeenCalled();
    });

    it('should set categoryId to null if category is incompatible', async () => {
      const recurring: Partial<RecurringTransaction> = {
        id: 'rec-1',
        userId,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        nextOccurrence: new Date('2026-01-01'),
        isActive: true,
      };

      repository.findDueRecurringTransactions.mockResolvedValue([recurring]);
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        isActive: true,
        type: CategoryType.INCOME, // Mismatched category type
      });

      repository.processOccurrence.mockResolvedValueOnce({
        created: true,
        skipped: false,
        deactivated: true,
        updatedRecurring: {
          ...recurring,
          isActive: false,
        },
      });

      await service.execute(userId, { until: '2026-01-15' });

      expect(repository.processOccurrence).toHaveBeenCalledWith(
        recurring,
        null,
      );
    });
  });
});
