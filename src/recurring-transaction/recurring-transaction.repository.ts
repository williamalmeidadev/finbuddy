import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import {
  RecurrenceFrequency,
  TransactionType,
} from '../generated/prisma/enums';
import { RecurringTransactionModel as RecurringTransaction } from '../generated/prisma/models/RecurringTransaction';

@Injectable()
export class RecurringTransactionRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async create(
    data: Prisma.RecurringTransactionUncheckedCreateInput,
  ): Promise<RecurringTransaction> {
    return this.prisma.recurringTransaction.create({
      data,
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<RecurringTransaction | null> {
    return this.prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });
  }

  async findByUserId(
    userId: string,
    options?: {
      accountId?: string;
      categoryId?: string;
      type?: TransactionType;
      frequency?: RecurrenceFrequency;
      isActive?: boolean;
    },
  ): Promise<RecurringTransaction[]> {
    return this.prisma.recurringTransaction.findMany({
      where: {
        userId,
        ...(options?.accountId ? { accountId: options.accountId } : {}),
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...(options?.type ? { type: options.type } : {}),
        ...(options?.frequency ? { frequency: options.frequency } : {}),
        ...(options?.isActive !== undefined
          ? { isActive: options.isActive }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Prisma.RecurringTransactionUncheckedUpdateInput,
  ): Promise<RecurringTransaction | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return null;
    }
    return this.prisma.recurringTransaction.update({
      where: { id },
      data,
    });
  }

  async deactivate(
    id: string,
    userId: string,
  ): Promise<RecurringTransaction | null> {
    return this.update(id, userId, { isActive: false });
  }
}
