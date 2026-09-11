import { BadRequestException, Injectable } from '@nestjs/common';
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

      if (balanceDelta < 0) {
        const updated = await tx.account.updateMany({
          where: {
            id: data.accountId,
            balance: {
              gte: Math.abs(balanceDelta),
            },
          },
          data: {
            balance: {
              increment: balanceDelta,
            },
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException('Insufficient balance');
        }
      } else {
        await tx.account.update({
          where: { id: data.accountId },
          data: {
            balance: {
              increment: balanceDelta,
            },
          },
        });
      }

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
    options?: { accountId?: string; limit?: number; offset?: number },
  ): Promise<Transaction[]> {
    const take = Math.min(options?.limit ?? 50, 100);
    const skip = options?.offset ?? 0;

    return this.prisma.transaction.findMany({
      where: {
        account: {
          userId,
        },
        ...(options?.accountId ? { accountId: options.accountId } : {}),
      },
      orderBy: {
        transactionAt: 'desc',
      },
      take,
      skip,
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
        if (balanceDelta < 0) {
          const updatedAccount = await tx.account.updateMany({
            where: {
              id: existing.accountId,
              balance: {
                gte: Math.abs(balanceDelta),
              },
            },
            data: {
              balance: {
                increment: balanceDelta,
              },
            },
          });

          if (updatedAccount.count === 0) {
            throw new BadRequestException('Insufficient balance');
          }
        } else {
          await tx.account.update({
            where: { id: existing.accountId },
            data: {
              balance: {
                increment: balanceDelta,
              },
            },
          });
        }
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

      if (reversalDelta < 0) {
        const updatedAccount = await tx.account.updateMany({
          where: {
            id: existing.accountId,
            balance: {
              gte: Math.abs(reversalDelta),
            },
          },
          data: {
            balance: {
              increment: reversalDelta,
            },
          },
        });

        if (updatedAccount.count === 0) {
          throw new BadRequestException('Insufficient balance');
        }
      } else {
        await tx.account.update({
          where: { id: existing.accountId },
          data: {
            balance: {
              increment: reversalDelta,
            },
          },
        });
      }

      return deleted;
    });
  }
}
