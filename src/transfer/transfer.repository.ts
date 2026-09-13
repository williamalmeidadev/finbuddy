import { BadRequestException, Injectable } from '@nestjs/common';
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
      const updatedSource = await tx.account.updateMany({
        where: {
          id: data.fromAccountId,
          balance: {
            gte: data.amount,
          },
        },
        data: {
          balance: {
            decrement: data.amount,
          },
        },
      });

      if (updatedSource.count === 0) {
        throw new BadRequestException('Insufficient balance for transfer');
      }

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

  async updateWithAtomicBalanceUpdate(
    transferId: string,
    userId: string,
    updates: {
      amount?: number;
      transactionAt?: Date;
      fromAccountId?: string;
      toAccountId?: string;
    },
  ): Promise<Transfer> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch the current transfer scoped to the user (IDOR guard)
      const current = await tx.transfer.findFirst({
        where: {
          id: transferId,
          OR: [{ fromAccount: { userId } }, { toAccount: { userId } }],
        },
      });

      if (!current) {
        const { NotFoundException } = await import('@nestjs/common');
        throw new NotFoundException('Transfer not found');
      }

      const oldAmount = (current.amount as unknown as { toNumber(): number })
        .toNumber
        ? (current.amount as unknown as { toNumber(): number }).toNumber()
        : Number(current.amount);

      const newAmount = updates.amount ?? oldAmount;
      const newFromAccountId = updates.fromAccountId ?? current.fromAccountId;
      const newToAccountId = updates.toAccountId ?? current.toAccountId;
      const newTransactionAt = updates.transactionAt ?? current.transactionAt;

      const accountsChanged =
        newFromAccountId !== current.fromAccountId ||
        newToAccountId !== current.toAccountId;
      const amountChanged = newAmount !== oldAmount;

      if (accountsChanged || amountChanged) {
        // 2. Reverse the financial effect from OLD source account
        await tx.account.update({
          where: { id: current.fromAccountId },
          data: { balance: { increment: oldAmount } },
        });

        // 3. Reverse the financial effect from OLD destination account
        await tx.account.update({
          where: { id: current.toAccountId },
          data: { balance: { decrement: oldAmount } },
        });

        // 4. Apply financial effect to NEW source account (with sufficient balance guard)
        const updatedSource = await tx.account.updateMany({
          where: {
            id: newFromAccountId,
            balance: { gte: newAmount },
          },
          data: { balance: { decrement: newAmount } },
        });

        if (updatedSource.count === 0) {
          const { BadRequestException } = await import('@nestjs/common');
          throw new BadRequestException('Insufficient balance for transfer');
        }

        // 5. Apply financial effect to NEW destination account
        await tx.account.update({
          where: { id: newToAccountId },
          data: { balance: { increment: newAmount } },
        });
      }

      // 6. Update Transfer record
      const updated = await tx.transfer.update({
        where: { id: transferId },
        data: {
          amount: newAmount,
          transactionAt: newTransactionAt,
          fromAccountId: newFromAccountId,
          toAccountId: newToAccountId,
        },
      });

      // 7. Synchronize SYSTEM transactions linked to this transfer
      const systemTxs = await tx.transaction.findMany({
        where: { transferId },
      });

      for (const stx of systemTxs) {
        const isSource = stx.type === TransactionType.EXPENSE;
        await tx.transaction.update({
          where: { id: stx.id },
          data: {
            amount: newAmount,
            transactionAt: newTransactionAt,
            accountId: isSource ? newFromAccountId : newToAccountId,
          },
        });
      }

      return updated;
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Transfer | null> {
    return this.prisma.transfer.findFirst({
      where: {
        id,
        OR: [{ fromAccount: { userId } }, { toAccount: { userId } }],
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
            OR: [{ fromAccount: { userId } }, { toAccount: { userId } }],
          },
          ...(options?.fromAccountId
            ? [{ fromAccountId: options.fromAccountId }]
            : []),
          ...(options?.toAccountId
            ? [{ toAccountId: options.toAccountId }]
            : []),
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
