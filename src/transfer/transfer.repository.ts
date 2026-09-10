import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { TransferModel as Transfer } from '../generated/prisma/models/Transfer';

@Injectable()
export class TransferRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async createWithAtomicBalanceUpdate(
    data: Prisma.TransferUncheckedCreateInput,
    fromAccountName: string,
    toAccountName: string,
  ): Promise<Transfer> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Create Transfer record
      const transfer = await tx.transfer.create({
        data,
      });

      // 2. Atomically decrease source account balance
      await tx.account.update({
        where: { id: data.fromAccountId },
        data: {
          balance: {
            decrement: data.amount,
          },
        },
      });

      // 3. Atomically increase destination account balance
      await tx.account.update({
        where: { id: data.toAccountId },
        data: {
          balance: {
            increment: data.amount,
          },
        },
      });

      // 4. Create linked transaction entries for history visibility (without triggering double balance updates)
      await tx.transaction.createMany({
        data: [
          {
            accountId: data.fromAccountId,
            transferId: transfer.id,
            type: TransactionType.EXPENSE,
            amount: data.amount,
            description: `Transfer to ${toAccountName}`,
            source: TransactionSource.SYSTEM,
            transactionAt: data.transactionAt,
          },
          {
            accountId: data.toAccountId,
            transferId: transfer.id,
            type: TransactionType.INCOME,
            amount: data.amount,
            description: `Transfer from ${fromAccountName}`,
            source: TransactionSource.SYSTEM,
            transactionAt: data.transactionAt,
          },
        ],
      });

      return transfer;
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Transfer | null> {
    return this.prisma.transfer.findFirst({
      where: {
        id,
        OR: [
          { fromAccount: { userId } },
          { toAccount: { userId } },
        ],
      },
    });
  }

  async findByUserId(
    userId: string,
    options?: {
      fromAccountId?: string;
      toAccountId?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<Transfer[]> {
    const take = Math.min(options?.limit ?? 50, 100);
    const skip = options?.offset ?? 0;

    return this.prisma.transfer.findMany({
      where: {
        AND: [
          {
            OR: [
              { fromAccount: { userId } },
              { toAccount: { userId } },
            ],
          },
          ...(options?.fromAccountId ? [{ fromAccountId: options.fromAccountId }] : []),
          ...(options?.toAccountId ? [{ toAccountId: options.toAccountId }] : []),
        ],
      },
      orderBy: {
        transactionAt: 'desc',
      },
      take,
      skip,
    });
  }
}
