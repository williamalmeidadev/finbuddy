import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateTransferDto {
  @ApiProperty({
    description: 'Source account UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  fromAccountId!: string;

  @ApiProperty({
    description: 'Destination account UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  @IsNotEmpty()
  toAccountId!: string;

  @ApiProperty({
    description: 'Transfer amount (must be positive number)',
    example: 100.0,
    minimum: 0.0001,
    maximum: 999999999999.9999,
  })
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  amount!: number;

  @ApiProperty({
    description: 'Transfer timestamp (ISO date-time string)',
    example: '2026-03-15T12:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  transactionAt!: Date;
}
