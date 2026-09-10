import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { BudgetModel as Budget } from '../generated/prisma/models/Budget';

@Injectable()
export class BudgetRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async create(data: Prisma.BudgetUncheckedCreateInput): Promise<Budget> {
    return this.prisma.budget.create({
      data,
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Budget | null> {
    return this.prisma.budget.findFirst({
      where: { id, userId },
    });
  }

  async findByCategoryMonthAndUserId(
    categoryId: string,
    month: Date,
    userId: string,
  ): Promise<Budget | null> {
    return this.prisma.budget.findFirst({
      where: {
        categoryId,
        userId,
        month,
      },
    });
  }

  async findByUserId(
    userId: string,
    options?: { categoryId?: string; month?: Date },
  ): Promise<Budget[]> {
    return this.prisma.budget.findMany({
      where: {
        userId,
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options?.month ? { month: options.month } : {}),
      },
      orderBy: { month: 'desc' },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Prisma.BudgetUpdateInput,
  ): Promise<Budget | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return null;
    }
    return this.prisma.budget.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, userId: string): Promise<Budget | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return null;
    }
    return this.prisma.budget.delete({
      where: { id },
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
}
