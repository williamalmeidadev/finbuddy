import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { TransactionType } from '../generated/prisma/enums';
import { FinancialSummaryRepository } from './financial-summary.repository';

describe('FinancialSummaryRepository', () => {
  let repository: FinancialSummaryRepository;

  const prismaMock = {
    account: {
      findMany: jest.fn(),
    },
    transaction: {
      aggregate: jest.fn(),
      groupBy: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    budget: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialSummaryRepository,
        {
          provide: DatabaseService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    repository = module.get<FinancialSummaryRepository>(
      FinancialSummaryRepository,
    );
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('getAccounts', () => {
    it('should return user accounts', async () => {
      const mockAccounts = [
        {
          id: 'acc-1',
          userId: 'user-1',
          name: 'Checking',
          type: 'CHECKING',
          balance: 1000,
          currency: 'BRL',
        },
      ];

      prismaMock.account.findMany.mockResolvedValue(mockAccounts);

      const result = await repository.getAccounts('user-1');

      expect(prismaMock.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(mockAccounts);
    });
  });

  describe('getMonthlyTotals', () => {
    it('should calculate income and expenses excluding transfers', async () => {
      const monthStart = new Date('2026-09-01T00:00:00.000Z');
      const nextMonthStart = new Date('2026-10-01T00:00:00.000Z');

      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 5000 } } })
        .mockResolvedValueOnce({ _sum: { amount: { toNumber: () => 3200 } } });

      const result = await repository.getMonthlyTotals(
        'user-1',
        monthStart,
        nextMonthStart,
      );

      expect(prismaMock.transaction.aggregate).toHaveBeenCalledTimes(2);
      expect(prismaMock.transaction.aggregate).toHaveBeenNthCalledWith(1, {
        _sum: { amount: true },
        where: {
          account: { userId: 'user-1' },
          type: TransactionType.INCOME,
          transferId: null,
          transactionAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        },
      });

      expect(result).toEqual({ income: 5000, expenses: 3200 });
    });

    it('should return 0 when aggregates are null', async () => {
      const monthStart = new Date('2026-09-01T00:00:00.000Z');
      const nextMonthStart = new Date('2026-10-01T00:00:00.000Z');

      prismaMock.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: null } })
        .mockResolvedValueOnce({ _sum: { amount: null } });

      const result = await repository.getMonthlyTotals(
        'user-1',
        monthStart,
        nextMonthStart,
      );

      expect(result).toEqual({ income: 0, expenses: 0 });
    });
  });

  describe('getCategoryAggregations', () => {
    it('should return category sums mapped with category names', async () => {
      const monthStart = new Date('2026-09-01T00:00:00.000Z');
      const nextMonthStart = new Date('2026-10-01T00:00:00.000Z');

      prismaMock.transaction.groupBy.mockResolvedValue([
        { categoryId: 'cat-1', _sum: { amount: { toNumber: () => 850 } } },
      ]);

      prismaMock.category.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Food', userId: 'user-1' },
      ]);

      const result = await repository.getCategoryAggregations(
        'user-1',
        monthStart,
        nextMonthStart,
        TransactionType.EXPENSE,
      );

      expect(result).toEqual([
        {
          categoryId: 'cat-1',
          categoryName: 'Food',
          amount: 850,
        },
      ]);
    });

    it('should return empty array if no transactions grouped', async () => {
      const monthStart = new Date('2026-09-01T00:00:00.000Z');
      const nextMonthStart = new Date('2026-10-01T00:00:00.000Z');

      prismaMock.transaction.groupBy.mockResolvedValue([]);

      const result = await repository.getCategoryAggregations(
        'user-1',
        monthStart,
        nextMonthStart,
        TransactionType.EXPENSE,
      );

      expect(result).toEqual([]);
    });
  });

  describe('getBudgetsForMonth', () => {
    it('should query budgets for user and month', async () => {
      const monthStart = new Date('2026-09-01T00:00:00.000Z');

      const mockBudgets = [{ id: 'budget-1', userId: 'user-1', amount: 800 }];
      prismaMock.budget.findMany.mockResolvedValue(mockBudgets);

      const result = await repository.getBudgetsForMonth('user-1', monthStart);

      expect(prismaMock.budget.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', month: monthStart },
        orderBy: { createdAt: 'asc' },
      });
      expect(result).toEqual(mockBudgets);
    });
  });
});
