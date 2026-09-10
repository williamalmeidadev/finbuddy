import {
  TransactionSource,
  TransactionType,
} from '../../generated/prisma/enums';

interface PrismaDecimal {
  toNumber(): number;
}

export class TransactionResponseDto {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: TransactionType;
  amount: number;
  description: string | null;
  source: TransactionSource;
  transactionAt: Date;
  createdAt: Date;
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
