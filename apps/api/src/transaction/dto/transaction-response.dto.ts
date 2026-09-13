import { ApiProperty } from '@nestjs/swagger';
import {
  TransactionSource,
  TransactionType,
} from '../../generated/prisma/enums';

interface PrismaDecimal {
  toNumber(): number;
}

export class TransactionResponseDto {
  @ApiProperty({
    description: 'Unique transaction identifier (UUID)',
    example: 't1u2v3w4-x5y6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Account UUID associated with the transaction',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  accountId: string;

  @ApiProperty({
    description: 'Category UUID (or null if uncategorized)',
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
    description: 'Transaction amount (number)',
    example: 45.99,
  })
  amount: number;

  @ApiProperty({
    description: 'Transaction description (or null)',
    nullable: true,
    example: 'Weekly grocery store purchase',
  })
  description: string | null;

  @ApiProperty({
    description: 'Transaction source',
    enum: TransactionSource,
    example: 'MANUAL',
  })
  source: TransactionSource;

  @ApiProperty({
    description: 'Transaction occurrence timestamp',
    example: '2026-03-15T10:30:00.000Z',
  })
  transactionAt: Date;

  @ApiProperty({
    description: 'Transaction creation timestamp',
    example: '2026-03-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Transaction last update timestamp',
    example: '2026-03-15T10:30:00.000Z',
  })
  updatedAt: Date;

  constructor(transaction: {
    id: string;
    accountId: string;
    categoryId?: string | null;
    type: TransactionType;
    amount: PrismaDecimal | number;
    description: string | null;
    source: TransactionSource;
    transactionAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = transaction.id;
    this.accountId = transaction.accountId;
    this.categoryId = transaction.categoryId ?? null;
    this.type = transaction.type;
    this.amount =
      typeof transaction.amount === 'number'
        ? transaction.amount
        : transaction.amount.toNumber();
    this.description = transaction.description;
    this.source = transaction.source;
    this.transactionAt = transaction.transactionAt;
    this.createdAt = transaction.createdAt;
    this.updatedAt = transaction.updatedAt;
  }
}
