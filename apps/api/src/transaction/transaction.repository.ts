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
    options?: {
      accountId?: string;
      categoryId?: string;
      month?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<
    (Transaction & { category?: { id: string; name: string } | null })[]
  > {
    const take = Math.min(options?.limit ?? 50, 100);
    const skip = options?.offset ?? 0;

    let dateFilter: Prisma.TransactionWhereInput = {};
    if (options?.month) {
      const match = options.month.match(/^(\d{4})-(0[1-9]|1[0-2])$/);
      if (match) {
        const year = parseInt(match[1], 10);
        const monthIdx = parseInt(match[2], 10) - 1;
        const monthStart = new Date(Date.UTC(year, monthIdx, 1, 0, 0, 0, 0));
        const nextMonthStart = new Date(
          Date.UTC(year, monthIdx + 1, 1, 0, 0, 0, 0),
        );
        dateFilter = {
          transactionAt: {
            gte: monthStart,
            lt: nextMonthStart,
          },
        };
      }
    }

    return this.prisma.transaction.findMany({
      where: {
        account: {
          userId,
        },
        ...(options?.accountId ? { accountId: options.accountId } : {}),
        ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
        ...dateFilter,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
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
    data: Prisma.TransactionUncheckedUpdateInput,
    balanceDelta: number,
    accountChange?: {
      oldAccountId: string;
      oldAccountReversalDelta: number;
      newAccountId: string;
      newAccountDelta: number;
    },
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

      if (accountChange) {
        if (accountChange.oldAccountReversalDelta < 0) {
          const updatedOldAccount = await tx.account.updateMany({
            where: {
              id: accountChange.oldAccountId,
              balance: {
                gte: Math.abs(accountChange.oldAccountReversalDelta),
              },
            },
            data: {
              balance: {
                increment: accountChange.oldAccountReversalDelta,
              },
            },
          });

          if (updatedOldAccount.count === 0) {
            throw new BadRequestException(
              'Insufficient balance in original account',
            );
          }
        } else if (accountChange.oldAccountReversalDelta !== 0) {
          await tx.account.update({
            where: { id: accountChange.oldAccountId },
            data: {
              balance: {
                increment: accountChange.oldAccountReversalDelta,
              },
            },
          });
        }

        if (accountChange.newAccountDelta < 0) {
          const updatedNewAccount = await tx.account.updateMany({
            where: {
              id: accountChange.newAccountId,
              balance: {
                gte: Math.abs(accountChange.newAccountDelta),
              },
            },
            data: {
              balance: {
                increment: accountChange.newAccountDelta,
              },
            },
          });

          if (updatedNewAccount.count === 0) {
            throw new BadRequestException(
              'Insufficient balance in target account',
            );
          }
        } else if (accountChange.newAccountDelta !== 0) {
          await tx.account.update({
            where: { id: accountChange.newAccountId },
            data: {
              balance: {
                increment: accountChange.newAccountDelta,
              },
            },
          });
        }
      } else if (balanceDelta !== 0) {
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
