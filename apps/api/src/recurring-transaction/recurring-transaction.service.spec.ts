import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountRepository } from '../account/account.repository';
import { CategoryRepository } from '../category/category.repository';
import {
  CategoryType,
  RecurrenceFrequency,
  TransactionType,
} from '../generated/prisma/enums';
import { RecurringTransactionResponseDto } from './dto/recurring-transaction-response.dto';
import { RecurringTransactionRepository } from './recurring-transaction.repository';
import { RecurringTransactionService } from './recurring-transaction.service';

describe('RecurringTransactionService', () => {
  let service: RecurringTransactionService;
  let repository: {
    create: jest.Mock;
    findByIdAndUserId: jest.Mock;
    findByUserId: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
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
      create: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    accountRepository = {
      findByIdAndUserId: jest.fn(),
    };

    categoryRepository = {
      findByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionService,
        {
          provide: RecurringTransactionRepository,
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

    service = module.get<RecurringTransactionService>(
      RecurringTransactionService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a recurring transaction successfully', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        type: CategoryType.EXPENSE,
        isActive: true,
      });

      const mockCreated = {
        id: 'rec-1',
        userId,
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 1500,
        description: 'Rent',
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: new Date(Date.UTC(2026, 8, 10)),
        nextOccurrence: new Date(Date.UTC(2026, 8, 10)),
        endDate: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.create.mockResolvedValue(mockCreated);

      const result = await service.create(userId, {
        accountId: 'acc-1',
        categoryId: 'cat-1',
        type: TransactionType.EXPENSE,
        amount: 1500,
        description: 'Rent',
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: '2026-09-10',
      });

      expect(result).toBeInstanceOf(RecurringTransactionResponseDto);
      expect(result.amount).toBe(1500);
      expect(result.startDate).toBe('2026-09-10');
      expect(result.nextOccurrence).toBe('2026-09-10');
    });

    it('should throw BadRequestException if amount is non-positive', async () => {
      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          type: TransactionType.EXPENSE,
          amount: 0,
          frequency: RecurrenceFrequency.MONTHLY,
          startDate: '2026-09-10',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if account is not found or owned by another user', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          accountId: 'acc-404',
          type: TransactionType.EXPENSE,
          amount: 100,
          frequency: RecurrenceFrequency.MONTHLY,
          startDate: '2026-09-10',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if account is inactive', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: false,
      });

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          type: TransactionType.EXPENSE,
          amount: 100,
          frequency: RecurrenceFrequency.MONTHLY,
          startDate: '2026-09-10',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if category is not found', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });
      categoryRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          categoryId: 'cat-404',
          type: TransactionType.EXPENSE,
          amount: 100,
          frequency: RecurrenceFrequency.MONTHLY,
          startDate: '2026-09-10',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category is inactive', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        type: CategoryType.EXPENSE,
        isActive: false,
      });

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          categoryId: 'cat-1',
          type: TransactionType.EXPENSE,
          amount: 100,
          frequency: RecurrenceFrequency.MONTHLY,
          startDate: '2026-09-10',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if category type does not match transaction type', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        type: CategoryType.INCOME,
        isActive: true,
      });

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          categoryId: 'cat-1',
          type: TransactionType.EXPENSE,
          amount: 100,
          frequency: RecurrenceFrequency.MONTHLY,
          startDate: '2026-09-10',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if endDate is before startDate', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          type: TransactionType.EXPENSE,
          amount: 100,
          frequency: RecurrenceFrequency.MONTHLY,
          startDate: '2026-09-10',
          endDate: '2026-09-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByUserId', () => {
    it('should return DTO list', async () => {
      repository.findByUserId.mockResolvedValue([
        {
          id: 'rec-1',
          userId,
          accountId: 'acc-1',
          type: TransactionType.EXPENSE,
          amount: 100,
          frequency: RecurrenceFrequency.DAILY,
          startDate: new Date(Date.UTC(2026, 8, 10)),
          nextOccurrence: new Date(Date.UTC(2026, 8, 10)),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findByUserId(userId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rec-1');
    });
  });

  describe('findById', () => {
    it('should return item when found', async () => {
      repository.findByIdAndUserId.mockResolvedValue({
        id: 'rec-1',
        userId,
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: 100,
        frequency: RecurrenceFrequency.DAILY,
        startDate: new Date(Date.UTC(2026, 8, 10)),
        nextOccurrence: new Date(Date.UTC(2026, 8, 10)),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById('rec-1', userId);
      expect(result.id).toBe('rec-1');
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);
      await expect(service.findById('rec-404', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update fields and recalculate nextOccurrence when startDate changes', async () => {
      const existing = {
        id: 'rec-1',
        userId,
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: 100,
        frequency: RecurrenceFrequency.DAILY,
        startDate: new Date(Date.UTC(2026, 8, 10)),
        nextOccurrence: new Date(Date.UTC(2026, 8, 10)),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findByIdAndUserId.mockResolvedValue(existing);
      repository.update.mockResolvedValue({
        ...existing,
        startDate: new Date(Date.UTC(2026, 8, 15)),
        nextOccurrence: new Date(Date.UTC(2026, 8, 15)),
      });

      const result = await service.update('rec-1', userId, {
        startDate: '2026-09-15',
      });

      expect(result.startDate).toBe('2026-09-15');
      expect(result.nextOccurrence).toBe('2026-09-15');
    });

    it('should throw NotFoundException if item to update does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.update('rec-404', userId, { amount: 200 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const existing = {
        id: 'rec-1',
        userId,
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: 100,
        frequency: RecurrenceFrequency.DAILY,
        startDate: new Date(Date.UTC(2026, 8, 10)),
        nextOccurrence: new Date(Date.UTC(2026, 8, 10)),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      repository.findByIdAndUserId.mockResolvedValue(existing);
      repository.deactivate.mockResolvedValue({
        ...existing,
        isActive: false,
      });

      const result = await service.deactivate('rec-1', userId);
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if item to deactivate does not exist', async () => {
      repository.findByIdAndUserId.mockResolvedValue(null);
      await expect(service.deactivate('rec-404', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
