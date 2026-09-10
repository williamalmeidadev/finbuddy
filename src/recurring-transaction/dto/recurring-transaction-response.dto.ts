import {
  RecurrenceFrequency,
  TransactionType,
} from '../../generated/prisma/enums';

interface PrismaDecimal {
  toNumber(): number;
}

export class RecurringTransactionResponseDto {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  frequency: RecurrenceFrequency;
  startDate: string;
  nextOccurrence: string;
  endDate: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(item: {
    id: string;
    accountId: string;
    categoryId?: string | null;
    type: TransactionType;
    amount: PrismaDecimal | number;
    description?: string | null;
    frequency: RecurrenceFrequency;
    startDate: Date | string;
    nextOccurrence: Date | string;
    endDate?: Date | string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = item.id;
    this.accountId = item.accountId;
    this.categoryId = item.categoryId ?? null;
    this.type = item.type;
    this.amount =
      typeof item.amount === 'number' ? item.amount : item.amount.toNumber();
    this.description = item.description ?? null;
    this.frequency = item.frequency;

    this.startDate = this.formatDate(item.startDate)!;
    this.nextOccurrence = this.formatDate(item.nextOccurrence)!;
    this.endDate = item.endDate ? this.formatDate(item.endDate) : null;

    this.isActive = item.isActive;
    this.createdAt = item.createdAt;
    this.updatedAt = item.updatedAt;
  }

  private formatDate(dateVal: Date | string): string {
    if (dateVal instanceof Date) {
      return dateVal.toISOString().split('T')[0];
    }
    return String(dateVal).split('T')[0];
  }
}
