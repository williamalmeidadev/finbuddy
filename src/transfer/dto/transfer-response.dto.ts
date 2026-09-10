interface PrismaDecimal {
  toNumber(): number;
}

export class TransferResponseDto {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transactionAt: Date;
  createdAt: Date;
  updatedAt: Date;

  constructor(transfer: {
    id: string;
    fromAccountId: string;
    toAccountId: string;
    amount: PrismaDecimal | number;
    transactionAt: Date;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = transfer.id;
    this.fromAccountId = transfer.fromAccountId;
    this.toAccountId = transfer.toAccountId;
    this.amount =
      typeof transfer.amount === 'number'
        ? transfer.amount
        : transfer.amount.toNumber();
    this.transactionAt = transfer.transactionAt;
    this.createdAt = transfer.createdAt;
    this.updatedAt = transfer.updatedAt;
  }
}
