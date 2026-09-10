import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { TransactionModel as Transaction } from '../generated/prisma/models/Transaction';

@Injectable()
export class TransactionRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async createWithBalanceUpdate(
    data: Prisma.TransactionUncheckedCreateInput,
    balanceDelta: number,
  ): Promise<Transaction> {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data,
      });

      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: {
            increment: balanceDelta,
          },
        },
      });

      return transaction;
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Transaction | null> {
    return this.prisma.transaction.findFirst({
      where: {
        id,
        account: {
          userId,
        },
      },
    });
  }

  async findByUserId(
    userId: string,
    accountId?: string,
  ): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      where: {
        account: {
          userId,
        },
        ...(accountId ? { accountId } : {}),
      },
      orderBy: {
        transactionAt: 'desc',
      },
    });
  }

  async updateWithBalanceUpdate(
    id: string,
    userId: string,
    data: Prisma.TransactionUpdateInput,
    balanceDelta: number,
  ): Promise<Transaction | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: {
          id,
          account: {
            userId,
          },
        },
      });

      if (!existing) {
        return null;
      }

      const updated = await tx.transaction.update({
        where: { id },
        data,
      });

      if (balanceDelta !== 0) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: {
            balance: {
              increment: balanceDelta,
            },
          },
        });
      }

      return updated;
    });
  }

  async deleteWithBalanceUpdate(
    id: string,
    userId: string,
    reversalDelta: number,
  ): Promise<Transaction | null> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: {
          id,
          account: {
            userId,
          },
        },
      });

      if (!existing) {
        return null;
      }

      const deleted = await tx.transaction.delete({
        where: { id },
      });

      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          balance: {
            increment: reversalDelta,
          },
        },
      });

      return deleted;
    });
  }
}
