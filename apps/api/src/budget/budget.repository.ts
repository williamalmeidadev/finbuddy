import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { BudgetModel as Budget } from '../generated/prisma/models/Budget';

@Injectable()
export class BudgetRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async create(data: Prisma.BudgetUncheckedCreateInput): Promise<any> {
    return this.prisma.budget.create({
      data,
      include: { category: true },
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<any> {
    return this.prisma.budget.findFirst({
      where: { id, userId },
      include: { category: true },
    });
  }

  async findByCategoryMonthAndUserId(
    categoryId: string,
    month: Date,
    userId: string,
  ): Promise<any> {
    return this.prisma.budget.findFirst({
      where: {
        categoryId,
        userId,
        month,
      },
      include: { category: true },
    });
  }

  async findByUserId(
    userId: string,
    options?: { categoryId?: string; month?: Date },
  ): Promise<any[]> {
    return this.prisma.budget.findMany({
      where: {
        userId,
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options?.month ? { month: options.month } : {}),
      },
      include: { category: true },
      orderBy: { month: 'desc' },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Prisma.BudgetUpdateInput,
  ): Promise<any> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return null;
    }
    return this.prisma.budget.update({
      where: { id },
      data,
      include: { category: true },
    });
  }

  async delete(id: string, userId: string): Promise<any> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return null;
    }
    return this.prisma.budget.delete({
      where: { id },
      include: { category: true },
    });
  }

  async calculateSpending(
    userId: string,
    categoryId: string,
    month: Date,
  ): Promise<number> {
    const year = month.getUTCFullYear();
    const monthIdx = month.getUTCMonth();

    const startOfMonth = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
    const nextMonthStart = new Date(
      Date.UTC(year, monthIdx + 1, 1, 0, 0, 0, 0),
    );

    const result = await this.prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        account: {
          userId,
        },
        categoryId,
        type: TransactionType.EXPENSE,
        source: {
          not: TransactionSource.SYSTEM,
        },
        transactionAt: {
          gte: startOfMonth,
          lt: nextMonthStart,
        },
      },
    });

    if (!result._sum.amount) {
      return 0;
    }

    return typeof result._sum.amount === 'number'
      ? result._sum.amount
      : result._sum.amount.toNumber();
  }

  async calculateSpendingBatch(
    userId: string,
    budgets: { categoryId: string; month: Date }[],
  ): Promise<Map<string, number>> {
    const spendingMap = new Map<string, number>();

    if (budgets.length === 0) {
      return spendingMap;
    }

    const monthGroups = new Map<
      string,
      {
        startOfMonth: Date;
        nextMonthStart: Date;
        categoryIds: Set<string>;
      }
    >();

    for (const budget of budgets) {
      const year = budget.month.getUTCFullYear();
      const monthIdx = budget.month.getUTCMonth();
      const startOfMonth = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
      const nextMonthStart = new Date(
        Date.UTC(year, monthIdx + 1, 1, 0, 0, 0, 0),
      );
      const monthKey = startOfMonth.toISOString();

      let group = monthGroups.get(monthKey);
      if (!group) {
        group = {
          startOfMonth,
          nextMonthStart,
          categoryIds: new Set<string>(),
        };
        monthGroups.set(monthKey, group);
      }
      group.categoryIds.add(budget.categoryId);

      spendingMap.set(`${budget.categoryId}:${startOfMonth.toISOString()}`, 0);
      spendingMap.set(`${budget.categoryId}:${startOfMonth.getTime()}`, 0);
      spendingMap.set(`${budget.categoryId}:${budget.month.toISOString()}`, 0);
    }

    await Promise.all(
      Array.from(monthGroups.values()).map(async (group) => {
        const results = await this.prisma.transaction.groupBy({
          by: ['categoryId'],
          _sum: { amount: true },
          where: {
            account: {
              userId,
            },
            categoryId: {
              in: Array.from(group.categoryIds),
            },
            type: TransactionType.EXPENSE,
            source: {
              not: TransactionSource.SYSTEM,
            },
            transactionAt: {
              gte: group.startOfMonth,
              lt: group.nextMonthStart,
            },
          },
        });

        for (const item of results) {
          if (!item.categoryId) continue;

          const amount = item._sum.amount
            ? typeof item._sum.amount === 'number'
              ? item._sum.amount
              : item._sum.amount.toNumber()
            : 0;

          const isoKey = `${item.categoryId}:${group.startOfMonth.toISOString()}`;
          const timeKey = `${item.categoryId}:${group.startOfMonth.getTime()}`;

          spendingMap.set(isoKey, amount);
          spendingMap.set(timeKey, amount);

          for (const b of budgets) {
            if (
              b.categoryId === item.categoryId &&
              b.month.getUTCFullYear() ===
                group.startOfMonth.getUTCFullYear() &&
              b.month.getUTCMonth() === group.startOfMonth.getUTCMonth()
            ) {
              spendingMap.set(
                `${b.categoryId}:${b.month.toISOString()}`,
                amount,
              );
            }
          }
        }
      }),
    );

    return spendingMap;
  }
}
