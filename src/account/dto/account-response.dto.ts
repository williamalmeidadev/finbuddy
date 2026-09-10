import { AccountType } from '../../generated/prisma/enums';

interface PrismaDecimal {
  toNumber(): number;
}

export class AccountResponseDto {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(account: {
    id: string;
    userId: string;
    name: string;
    type: AccountType;
    balance: PrismaDecimal | number;
    currency: string;
    color: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = account.id;
    this.userId = account.userId;
    this.name = account.name;
    this.type = account.type;
    this.balance =
      typeof account.balance === 'number'
        ? account.balance
        : account.balance.toNumber();
    this.currency = account.currency;
    this.color = account.color;
    this.isActive = account.isActive;
    this.createdAt = account.createdAt;
    this.updatedAt = account.updatedAt;
  }
}
