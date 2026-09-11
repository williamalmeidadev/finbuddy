import { ApiProperty } from '@nestjs/swagger';
import {
  RecurrenceFrequency,
  TransactionType,
} from '../../generated/prisma/enums';

interface PrismaDecimal {
  toNumber(): number;
}

export class RecurringTransactionResponseDto {
  @ApiProperty({
    description: 'Unique recurring transaction rule identifier (UUID)',
    example: 'r1e2c3u4-r5r6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Account UUID associated with recurring transaction',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  accountId: string;

  @ApiProperty({
    description: 'Category UUID (or null)',
    nullable: true,
    example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
  })
  categoryId: string | null;

  @ApiProperty({
    description: 'Transaction type',
    enum: TransactionType,
    example: 'EXPENSE',
  })
  type: TransactionType;

  @ApiProperty({
    description: 'Recurring amount (number)',
    example: 19.99,
  })
  amount: number;

  @ApiProperty({
    description: 'Description (or null)',
    nullable: true,
    example: 'Monthly streaming service subscription',
  })
  description: string | null;

  @ApiProperty({
    description: 'Recurrence frequency',
    enum: RecurrenceFrequency,
    example: 'MONTHLY',
  })
  frequency: RecurrenceFrequency;

  @ApiProperty({
    description: 'Start date (YYYY-MM-DD)',
    example: '2026-03-01',
  })
  startDate: string;

  @ApiProperty({
    description: 'Next calculated occurrence date (YYYY-MM-DD)',
    example: '2026-04-01',
  })
  nextOccurrence: string;

  @ApiProperty({
    description: 'End date (YYYY-MM-DD or null)',
    nullable: true,
    example: '2026-12-31',
  })
  endDate: string | null;

  @ApiProperty({
    description: 'Whether the recurring rule is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Rule creation timestamp',
    example: '2026-03-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Rule last update timestamp',
    example: '2026-03-01T00:00:00.000Z',
  })
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
