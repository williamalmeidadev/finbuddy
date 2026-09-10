import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TransactionType } from '../generated/prisma/enums';
import { AccountModel as Account } from '../generated/prisma/models/Account';
import { BudgetModel as Budget } from '../generated/prisma/models/Budget';

export interface RawCategoryAggregation {
  categoryId: string;
  categoryName: string;
  amount: number;
}

@Injectable()
export class FinancialSummaryRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async getAccounts(userId: string): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });
  }

  async getMonthlyTotals(
    userId: string,
    monthStart: Date,
    nextMonthStart: Date,
  ): Promise<{ income: number; expenses: number }> {
    const incomeAggregate = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        account: { userId },
        type: TransactionType.INCOME,
        transferId: null,
        transactionAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });

    const expenseAggregate = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        account: { userId },
        type: TransactionType.EXPENSE,
        transferId: null,
        transactionAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });

    const income = incomeAggregate._sum.amount
      ? typeof incomeAggregate._sum.amount === 'number'
        ? incomeAggregate._sum.amount
        : incomeAggregate._sum.amount.toNumber()
      : 0;

    const expenses = expenseAggregate._sum.amount
      ? typeof expenseAggregate._sum.amount === 'number'
        ? expenseAggregate._sum.amount
        : expenseAggregate._sum.amount.toNumber()
      : 0;

    return { income, expenses };
  }

  async getCategoryAggregations(
    userId: string,
    monthStart: Date,
    nextMonthStart: Date,
    type: TransactionType,
  ): Promise<RawCategoryAggregation[]> {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
      where: {
        account: { userId },
        type,
        transferId: null,
        categoryId: { not: null },
        transactionAt: {
          gte: monthStart,
          lt: nextMonthStart,
        },
      },
    });

    const categoryIds = grouped
      .map((g) => g.categoryId)
      .filter((id): id is string => id !== null);

    if (categoryIds.length === 0) {
      return [];
    }

    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds }, userId },
    });

    const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

    return grouped
      .filter((g) => g.categoryId && categoryMap.has(g.categoryId))
      .map((g) => {
        const amount = g._sum.amount
          ? typeof g._sum.amount === 'number'
            ? g._sum.amount
            : g._sum.amount.toNumber()
          : 0;

        return {
          categoryId: g.categoryId!,
          categoryName: categoryMap.get(g.categoryId!) || 'Unknown',
          amount,
        };
      });
  }

  async getBudgetsForMonth(
    userId: string,
    monthStart: Date,
  ): Promise<Budget[]> {
    return this.prisma.budget.findMany({
      where: { userId, month: monthStart },
      orderBy: { createdAt: 'asc' },
    });
  }
}
