import { ApiProperty } from '@nestjs/swagger';
import { AccountType } from '../../generated/prisma/enums';

interface PrismaDecimal {
  toNumber(): number;
}

export class AccountResponseDto {
  @ApiProperty({
    description: 'Unique account identifier (UUID)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Owner user ID (UUID)',
    example: 'u1v2w3x4-y5z6-7890-abcd-ef1234567890',
  })
  userId: string;

  @ApiProperty({
    description: 'Account display name',
    example: 'Main Checking Account',
  })
  name: string;

  @ApiProperty({
    description: 'Account type',
    enum: AccountType,
    example: 'CHECKING',
  })
  type: AccountType;

  @ApiProperty({
    description: 'Current account balance (number)',
    example: 1500.5,
  })
  balance: number;

  @ApiProperty({
    description: '3-letter ISO currency code',
    example: 'BRL',
  })
  currency: string;

  @ApiProperty({
    description: 'Hex color code',
    example: '#820AD1',
  })
  color: string;

  @ApiProperty({
    description: 'Whether the account is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Account last update timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
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
