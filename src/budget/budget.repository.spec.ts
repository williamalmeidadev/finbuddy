import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { BudgetRepository } from './budget.repository';

describe('BudgetRepository', () => {
  let repository: BudgetRepository;

  const prismaMock = {
    budget: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetRepository,
        {
          provide: DatabaseService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    repository = module.get<BudgetRepository>(BudgetRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a budget', async () => {
      const data: Prisma.BudgetUncheckedCreateInput = {
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 800,
        month: new Date('2026-09-01T00:00:00.000Z'),
      };

      const created = {
        id: 'budget-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.budget.create.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(prismaMock.budget.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(created);
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return budget when found', async () => {
      const budget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 800,
        month: new Date('2026-09-01T00:00:00.000Z'),
      };

      prismaMock.budget.findFirst.mockResolvedValue(budget);

      const result = await repository.findByIdAndUserId('budget-1', 'user-1');

      expect(prismaMock.budget.findFirst).toHaveBeenCalledWith({
        where: { id: 'budget-1', userId: 'user-1' },
      });
      expect(result).toEqual(budget);
    });

    it('should return null when not found', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdAndUserId('budget-404', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('findByCategoryMonthAndUserId', () => {
    it('should return budget matching category, month and userId', async () => {
      const month = new Date('2026-09-01T00:00:00.000Z');
      const budget = {
        id: 'budget-1',
        userId: 'user-1',
        categoryId: 'cat-1',
        amount: 800,
        month,
      };

      prismaMock.budget.findFirst.mockResolvedValue(budget);

      const result = await repository.findByCategoryMonthAndUserId(
        'cat-1',
        month,
        'user-1',
      );

      expect(prismaMock.budget.findFirst).toHaveBeenCalledWith({
        where: { categoryId: 'cat-1', userId: 'user-1', month },
      });
      expect(result).toEqual(budget);
    });
  });

  describe('findByUserId', () => {
    it('should return list of budgets for user', async () => {
      const budgets = [
        {
          id: 'budget-1',
          userId: 'user-1',
          categoryId: 'cat-1',
          amount: 800,
          month: new Date('2026-09-01T00:00:00.000Z'),
        },
      ];

      prismaMock.budget.findMany.mockResolvedValue(budgets);

      const result = await repository.findByUserId('user-1');

      expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { month: 'desc' },
      });
      expect(result).toEqual(budgets);
    });
  });

  describe('update', () => {
    it('should update budget if owned by user', async () => {
      const existing = {
        id: 'budget-1',
        userId: 'user-1',
        amount: 800,
      };
      const updated = { ...existing, amount: 1000 };

      prismaMock.budget.findFirst.mockResolvedValue(existing);
      prismaMock.budget.update.mockResolvedValue(updated);

      const result = await repository.update('budget-1', 'user-1', {
        amount: 1000,
      });

      expect(result).toEqual(updated);
    });

    it('should return null when budget not found', async () => {
      prismaMock.budget.findFirst.mockResolvedValue(null);

      const result = await repository.update('budget-404', 'user-1', {
        amount: 1000,
      });

      expect(result).toBeNull();
      expect(prismaMock.budget.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete budget if owned by user', async () => {
      const existing = {
        id: 'budget-1',
        userId: 'user-1',
      };

      prismaMock.budget.findFirst.mockResolvedValue(existing);
      prismaMock.budget.delete.mockResolvedValue(existing);

      const result = await repository.delete('budget-1', 'user-1');

      expect(prismaMock.budget.delete).toHaveBeenCalledWith({
        where: { id: 'budget-1' },
      });
      expect(result).toEqual(existing);
    });
  });

  describe('calculateSpending', () => {
    it('should aggregate EXPENSE non-SYSTEM transactions within month boundaries for user accounts', async () => {
      const month = new Date('2026-09-01T00:00:00.000Z');

      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: { toNumber: () => 325.5 } },
      });

      const spent = await repository.calculateSpending(
        'user-1',
        'cat-1',
        month,
      );

      expect(prismaMock.transaction.aggregate).toHaveBeenCalledWith({
        _sum: { amount: true },
        where: {
          account: { userId: 'user-1' },
          categoryId: 'cat-1',
          type: TransactionType.EXPENSE,
          source: { not: TransactionSource.SYSTEM },
          transactionAt: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lt: new Date('2026-10-01T00:00:00.000Z'),
          },
        },
      });
      expect(spent).toBe(325.5);
    });

    it('should return 0 if no matching transactions exist', async () => {
      const month = new Date('2026-09-01T00:00:00.000Z');

      prismaMock.transaction.aggregate.mockResolvedValue({
        _sum: { amount: null },
      });

      const spent = await repository.calculateSpending(
        'user-1',
        'cat-1',
        month,
      );

      expect(spent).toBe(0);
    });
  });

  describe('calculateSpendingBatch', () => {
    it('should aggregate EXPENSE non-SYSTEM transactions in batch grouped by categoryId', async () => {
      const budgets = [
        {
          categoryId: 'cat-1',
          month: new Date('2026-09-01T00:00:00.000Z'),
        },
        {
          categoryId: 'cat-2',
          month: new Date('2026-09-01T00:00:00.000Z'),
        },
      ];

      prismaMock.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: { toNumber: () => 450 } } },
        { categoryId: 'cat-2', _sum: { amount: 150 } },
      ]);

      const spending = await repository.calculateSpendingBatch(
        'user-1',
        budgets,
      );

      expect(prismaMock.transaction.groupBy).toHaveBeenCalledTimes(1);
      expect(prismaMock.transaction.groupBy).toHaveBeenCalledWith({
        by: ['categoryId'],
        _sum: { amount: true },
        where: {
          account: { userId: 'user-1' },
          categoryId: { in: ['cat-1', 'cat-2'] },
          type: TransactionType.EXPENSE,
          source: { not: TransactionSource.SYSTEM },
          transactionAt: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lt: new Date('2026-10-01T00:00:00.000Z'),
          },
        },
      });

      expect(spending.get('cat-1:2026-09-01T00:00:00.000Z')).toBe(450);
      expect(spending.get('cat-2:2026-09-01T00:00:00.000Z')).toBe(150);
    });

    it('should return empty map without querying if budgets is empty', async () => {
      const spending = await repository.calculateSpendingBatch('user-1', []);
      expect(spending.size).toBe(0);
      expect(prismaMock.transaction.groupBy).not.toHaveBeenCalled();
    });

    it('should group budgets across multiple months into separate groupBy queries', async () => {
      const budgets = [
        {
          categoryId: 'cat-1',
          month: new Date('2026-09-01T00:00:00.000Z'),
        },
        {
          categoryId: 'cat-2',
          month: new Date('2026-10-01T00:00:00.000Z'),
        },
      ];

      prismaMock.transaction.groupBy
        .mockResolvedValueOnce([{ categoryId: 'cat-1', _sum: { amount: 200 } }])
        .mockResolvedValueOnce([
          { categoryId: 'cat-2', _sum: { amount: 300 } },
        ]);

      const spending = await repository.calculateSpendingBatch(
        'user-1',
        budgets,
      );

      expect(prismaMock.transaction.groupBy).toHaveBeenCalledTimes(2);
      expect(spending.get('cat-1:2026-09-01T00:00:00.000Z')).toBe(200);
      expect(spending.get('cat-2:2026-10-01T00:00:00.000Z')).toBe(300);
    });

    it('should default to 0 for categories with no transactions in groupBy result', async () => {
      const budgets = [
        {
          categoryId: 'cat-1',
          month: new Date('2026-09-01T00:00:00.000Z'),
        },
      ];

      prismaMock.transaction.groupBy.mockResolvedValue([]);

      const spending = await repository.calculateSpendingBatch(
        'user-1',
        budgets,
      );

      expect(spending.get('cat-1:2026-09-01T00:00:00.000Z')).toBe(0);
    });
  });
});
