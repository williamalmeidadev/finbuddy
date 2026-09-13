import { BadRequestException, Injectable } from '@nestjs/common';
import { BudgetRepository } from '../budget/budget.repository';
import { TransactionType } from '../generated/prisma/enums';
import { FinancialSummaryQueryDto } from './dto/financial-summary-query.dto';
import {
  AccountSummaryItem,
  BudgetSummaryItem,
  CategorySummaryItem,
  FinancialSummaryResponseDto,
} from './dto/financial-summary-response.dto';
import { FinancialSummaryRepository } from './financial-summary.repository';

@Injectable()
export class FinancialSummaryService {
  constructor(
    private readonly repository: FinancialSummaryRepository,
    private readonly budgetRepository: BudgetRepository,
  ) {}

  async getSummary(
    userId: string,
    query?: FinancialSummaryQueryDto,
  ): Promise<FinancialSummaryResponseDto> {
    const { monthStart, nextMonthStart, monthFormatted } = this.resolvePeriod(
      query?.month,
    );

    const dbAccounts = await this.repository.getAccounts(userId);
    const accountItems: AccountSummaryItem[] = dbAccounts.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: typeof a.balance === 'number' ? a.balance : a.balance.toNumber(),
      currency: a.currency,
    }));

    const { income, expenses } = await this.repository.getMonthlyTotals(
      userId,
      monthStart,
      nextMonthStart,
    );

    const rawIncomeCats = await this.repository.getCategoryAggregations(
      userId,
      monthStart,
      nextMonthStart,
      TransactionType.INCOME,
    );

    const rawExpenseCats = await this.repository.getCategoryAggregations(
      userId,
      monthStart,
      nextMonthStart,
      TransactionType.EXPENSE,
    );

    const incomeCategories: CategorySummaryItem[] = rawIncomeCats.map(
      (item) => {
        const percentage =
          income > 0 ? Number(((item.amount / income) * 100).toFixed(2)) : 0;
        return {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          amount: Number(item.amount.toFixed(4)),
          percentage,
        };
      },
    );

    const expenseCategories: CategorySummaryItem[] = rawExpenseCats.map(
      (item) => {
        const percentage =
          expenses > 0
            ? Number(((item.amount / expenses) * 100).toFixed(2))
            : 0;
        return {
          categoryId: item.categoryId,
          categoryName: item.categoryName,
          amount: Number(item.amount.toFixed(4)),
          percentage,
        };
      },
    );

    const dbBudgets = await this.repository.getBudgetsForMonth(
      userId,
      monthStart,
    );

    const budgetItems: BudgetSummaryItem[] = await Promise.all(
      dbBudgets.map(async (budget) => {
        const spent = await this.budgetRepository.calculateSpending(
          userId,
          budget.categoryId,
          budget.month,
        );

        const amount =
          typeof budget.amount === 'number'
            ? budget.amount
            : budget.amount.toNumber();

        const spentNum = Number(spent.toFixed(4));
        const remaining = Number((amount - spentNum).toFixed(4));
        const percentageUsed =
          amount > 0 ? Number(((spentNum / amount) * 100).toFixed(2)) : 0;

        return {
          id: budget.id,
          categoryId: budget.categoryId,
          amount,
          spent: spentNum,
          remaining,
          percentageUsed,
        };
      }),
    );

    return new FinancialSummaryResponseDto({
      month: monthFormatted,
      income,
      expenses,
      accounts: accountItems,
      incomeCategories,
      expenseCategories,
      budgets: budgetItems,
    });
  }

  private resolvePeriod(monthStr?: string): {
    monthStart: Date;
    nextMonthStart: Date;
    monthFormatted: string;
  } {
    let year: number;
    let monthIdx: number;

    if (monthStr) {
      const match = monthStr.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
      if (!match) {
        throw new BadRequestException('Invalid month format');
      }
      year = parseInt(match[1], 10);
      monthIdx = parseInt(match[2], 10) - 1;
    } else {
      const now = new Date();
      year = now.getUTCFullYear();
      monthIdx = now.getUTCMonth();
    }

    const monthStart = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(
      Date.UTC(year, monthIdx + 1, 1, 0, 0, 0, 0),
    );
    const monthFormatted = `${year}-${String(monthIdx + 1).padStart(2, '0')}`;

    return { monthStart, nextMonthStart, monthFormatted };
  }
}
