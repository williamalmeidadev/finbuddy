import { ApiProperty } from '@nestjs/swagger';

interface PrismaDecimal {
  toNumber(): number;
}

export class TransferResponseDto {
  @ApiProperty({
    description: 'Unique transfer identifier (UUID)',
    example: 'tr1u2v3w-x5y6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Source account UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  fromAccountId: string;

  @ApiProperty({
    description: 'Destination account UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  toAccountId: string;

  @ApiProperty({
    description: 'Transfer amount (number)',
    example: 100.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Transfer occurrence timestamp',
    example: '2026-03-15T12:00:00.000Z',
  })
  transactionAt: Date;

  @ApiProperty({
    description: 'Transfer creation timestamp',
    example: '2026-03-15T12:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Transfer last update timestamp',
    example: '2026-03-15T12:00:00.000Z',
  })
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
