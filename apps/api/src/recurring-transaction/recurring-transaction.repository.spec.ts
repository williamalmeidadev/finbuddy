import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import {
  RecurrenceFrequency,
  TransactionType,
} from '../generated/prisma/enums';
import { RecurringTransactionRepository } from './recurring-transaction.repository';

describe('RecurringTransactionRepository', () => {
  let repository: RecurringTransactionRepository;

  const prismaMock = {
    recurringTransaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionRepository,
        {
          provide: DatabaseService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    repository = module.get<RecurringTransactionRepository>(
      RecurringTransactionRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a recurring transaction', async () => {
      const data: Prisma.RecurringTransactionUncheckedCreateInput = {
        userId: 'user-1',
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: 1500,
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: new Date('2026-09-10T00:00:00.000Z'),
        nextOccurrence: new Date('2026-09-10T00:00:00.000Z'),
      };

      const created = {
        id: 'rec-1',
        ...data,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.recurringTransaction.create.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(prismaMock.recurringTransaction.create).toHaveBeenCalledWith({
        data,
      });
      expect(result).toEqual(created);
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return item when found', async () => {
      const item = {
        id: 'rec-1',
        userId: 'user-1',
        accountId: 'acc-1',
        isActive: true,
      };

      prismaMock.recurringTransaction.findFirst.mockResolvedValue(item);

      const result = await repository.findByIdAndUserId('rec-1', 'user-1');

      expect(prismaMock.recurringTransaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'rec-1', userId: 'user-1' },
      });
      expect(result).toEqual(item);
    });

    it('should return null when not found', async () => {
      prismaMock.recurringTransaction.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdAndUserId('rec-404', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return list of recurring transactions for user', async () => {
      const items = [{ id: 'rec-1', userId: 'user-1' }];
      prismaMock.recurringTransaction.findMany.mockResolvedValue(items);

      const result = await repository.findByUserId('user-1', {
        type: TransactionType.EXPENSE,
      });

      expect(prismaMock.recurringTransaction.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', type: TransactionType.EXPENSE },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(items);
    });
  });

  describe('update', () => {
    it('should update recurring transaction if owned by user', async () => {
      const existing = { id: 'rec-1', userId: 'user-1', amount: 1500 };
      const updated = { ...existing, amount: 1600 };

      prismaMock.recurringTransaction.findFirst.mockResolvedValue(existing);
      prismaMock.recurringTransaction.update.mockResolvedValue(updated);

      const result = await repository.update('rec-1', 'user-1', {
        amount: 1600,
      });

      expect(result).toEqual(updated);
    });

    it('should return null if not found', async () => {
      prismaMock.recurringTransaction.findFirst.mockResolvedValue(null);

      const result = await repository.update('rec-404', 'user-1', {
        amount: 1600,
      });

      expect(result).toBeNull();
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const existing = { id: 'rec-1', userId: 'user-1', isActive: true };
      const deactivated = { ...existing, isActive: false };

      prismaMock.recurringTransaction.findFirst.mockResolvedValue(existing);
      prismaMock.recurringTransaction.update.mockResolvedValue(deactivated);

      const result = await repository.deactivate('rec-1', 'user-1');

      expect(prismaMock.recurringTransaction.update).toHaveBeenCalledWith({
        where: { id: 'rec-1' },
        data: { isActive: false },
      });
      expect(result).toEqual(deactivated);
    });
  });
});
