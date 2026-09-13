import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { RecurringTransactionModel as RecurringTransaction } from '../generated/prisma/models/RecurringTransaction';
import { calculateNextOccurrence } from '../recurring-transaction/utils/recurrence-calculator.util';

export interface ProcessOccurrenceResult {
  created: boolean;
  skipped: boolean;
  deactivated: boolean;
  updatedRecurring: RecurringTransaction;
}

@Injectable()
export class RecurringTransactionExecutionRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async findDueRecurringTransactions(
    userId: string,
    untilDate: Date,
  ): Promise<RecurringTransaction[]> {
    return this.prisma.recurringTransaction.findMany({
      where: {
        userId,
        isActive: true,
        nextOccurrence: {
          lte: untilDate,
        },
      },
      orderBy: {
        nextOccurrence: 'asc',
      },
    });
  }

  async findAllDueRecurringTransactions(
    untilDate: Date,
  ): Promise<RecurringTransaction[]> {
    return this.prisma.recurringTransaction.findMany({
      where: {
        isActive: true,
        nextOccurrence: {
          lte: untilDate,
        },
      },
      orderBy: {
        nextOccurrence: 'asc',
      },
    });
  }

  async processOccurrence(
    recurring: RecurringTransaction,
    categoryIdToUse: string | null,
  ): Promise<ProcessOccurrenceResult> {
    return this.prisma.$transaction(async (tx) => {
      const existingTx = await tx.transaction.findUnique({
        where: {
          recurringTransactionId_recurringOccurrence: {
            recurringTransactionId: recurring.id,
            recurringOccurrence: recurring.nextOccurrence,
          },
        },
      });

      let created = false;
      let skipped = false;

      if (existingTx) {
        skipped = true;
      } else {
        const amountNum = Number(recurring.amount);
        const balanceDelta =
          recurring.type === TransactionType.INCOME ? amountNum : -amountNum;

        await tx.transaction.create({
          data: {
            accountId: recurring.accountId,
            categoryId: categoryIdToUse,
            type: recurring.type,
            amount: recurring.amount,
            description: recurring.description,
            source: TransactionSource.SYSTEM,
            transactionAt: recurring.nextOccurrence,
            recurringTransactionId: recurring.id,
            recurringOccurrence: recurring.nextOccurrence,
          },
        });

        await tx.account.update({
          where: { id: recurring.accountId },
          data: {
            balance: {
              increment: balanceDelta,
            },
          },
        });

        created = true;
      }

      const nextOcc = calculateNextOccurrence(
        recurring.nextOccurrence,
        recurring.frequency,
        recurring.endDate,
      );

      let deactivated = false;
      let updatedRecurring: RecurringTransaction;

      if (!nextOcc || (recurring.endDate && nextOcc > recurring.endDate)) {
        updatedRecurring = await tx.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            isActive: false,
            ...(nextOcc ? { nextOccurrence: nextOcc } : {}),
          },
        });
        deactivated = true;
      } else {
        updatedRecurring = await tx.recurringTransaction.update({
          where: { id: recurring.id },
          data: {
            nextOccurrence: nextOcc,
          },
        });
      }

      return {
        created,
        skipped,
        deactivated,
        updatedRecurring,
      };
    });
  }
}
