import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BudgetRepository } from '../budget/budget.repository';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';
import { FinancialSummaryRepository } from './financial-summary.repository';
import { FinancialSummaryService } from './financial-summary.service';

describe('FinancialSummaryService', () => {
  let service: FinancialSummaryService;
  let summaryRepository: {
    getAccounts: jest.Mock;
    getMonthlyTotals: jest.Mock;
    getCategoryAggregations: jest.Mock;
    getBudgetsForMonth: jest.Mock;
  };
  let budgetRepository: {
    calculateSpending: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    summaryRepository = {
      getAccounts: jest.fn(),
      getMonthlyTotals: jest.fn(),
      getCategoryAggregations: jest.fn(),
      getBudgetsForMonth: jest.fn(),
    };

    budgetRepository = {
      calculateSpending: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinancialSummaryService,
        {
          provide: FinancialSummaryRepository,
          useValue: summaryRepository,
        },
        {
          provide: BudgetRepository,
          useValue: budgetRepository,
        },
      ],
    }).compile();

    service = module.get<FinancialSummaryService>(FinancialSummaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSummary', () => {
    it('should generate financial summary for an explicit month', async () => {
      summaryRepository.getAccounts.mockResolvedValue([
        {
          id: 'acc-1',
          name: 'Main Checking',
          type: 'CHECKING',
          balance: 5000,
          currency: 'BRL',
        },
        {
          id: 'acc-2',
          name: 'Savings',
          type: 'SAVINGS',
          balance: 3500,
          currency: 'BRL',
        },
      ]);

      summaryRepository.getMonthlyTotals.mockResolvedValue({
        income: 5000,
        expenses: 3200,
      });

      summaryRepository.getCategoryAggregations
        .mockResolvedValueOnce([
          { categoryId: 'cat-income-1', categoryName: 'Salary', amount: 5000 },
        ])
        .mockResolvedValueOnce([
          { categoryId: 'cat-exp-1', categoryName: 'Food', amount: 850 },
        ]);

      summaryRepository.getBudgetsForMonth.mockResolvedValue([
        {
          id: 'budget-1',
          categoryId: 'cat-exp-1',
          amount: 800,
          month: new Date('2026-09-01T00:00:00.000Z'),
        },
      ]);

      budgetRepository.calculateSpending.mockResolvedValue(325.5);

      const result = await service.getSummary(userId, { month: '2026-09' });

      expect(result).toBeInstanceOf(FinancialSummaryResponseDto);
      expect(result.period.month).toBe('2026-09');
      expect(result.summary.income).toBe(5000);
      expect(result.summary.expenses).toBe(3200);
      expect(result.summary.net).toBe(1800);
      expect(result.accounts.totalBalance).toBe(8500);
      expect(result.categories.income[0].percentage).toBe(100);
      expect(result.categories.expenses[0].percentage).toBe(26.56);
      expect(result.budgets[0].spent).toBe(325.5);
      expect(result.budgets[0].remaining).toBe(474.5);
      expect(result.budgets[0].percentageUsed).toBe(40.69);
    });

    it('should throw BadRequestException if month format is invalid', async () => {
      await expect(
        service.getSummary(userId, { month: '2026-13' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should default to current month when query month is omitted', async () => {
      summaryRepository.getAccounts.mockResolvedValue([]);
      summaryRepository.getMonthlyTotals.mockResolvedValue({
        income: 0,
        expenses: 0,
      });
      summaryRepository.getCategoryAggregations.mockResolvedValue([]);
      summaryRepository.getBudgetsForMonth.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result.period.month).toMatch(/^\d{4}-\d{2}$/);
      expect(result.summary.income).toBe(0);
      expect(result.summary.expenses).toBe(0);
      expect(result.summary.net).toBe(0);
    });

    it('should handle zero totals without producing NaN percentages', async () => {
      summaryRepository.getAccounts.mockResolvedValue([]);
      summaryRepository.getMonthlyTotals.mockResolvedValue({
        income: 0,
        expenses: 0,
      });
      summaryRepository.getCategoryAggregations
        .mockResolvedValueOnce([
          { categoryId: 'cat-income', categoryName: 'Bonus', amount: 0 },
        ])
        .mockResolvedValueOnce([
          { categoryId: 'cat-expense', categoryName: 'Food', amount: 0 },
        ]);
      summaryRepository.getBudgetsForMonth.mockResolvedValue([]);

      const result = await service.getSummary(userId, { month: '2026-09' });

      expect(result.categories.income[0].percentage).toBe(0);
      expect(result.categories.expenses[0].percentage).toBe(0);
    });
  });
});
