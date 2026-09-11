import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  TransactionSource,
  TransactionType,
} from '../../generated/prisma/enums';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Account UUID associated with the transaction',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Category UUID associated with the transaction',
    example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({
    description: 'Transaction type (INCOME or EXPENSE)',
    enum: TransactionType,
    example: 'EXPENSE',
  })
  @IsEnum(TransactionType)
  type!: TransactionType;

  @ApiProperty({
    description: 'Positive transaction amount (number)',
    example: 45.99,
    minimum: 0.0001,
    maximum: 999999999999.9999,
  })
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  amount!: number;

  @ApiPropertyOptional({
    description: 'Optional transaction description',
    example: 'Weekly grocery store purchase',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 255)
  description?: string;

  @ApiPropertyOptional({
    description: 'Transaction source (defaults to MANUAL)',
    enum: TransactionSource,
    example: 'MANUAL',
    default: 'MANUAL',
  })
  @IsEnum(TransactionSource)
  @IsOptional()
  source?: TransactionSource;

  @ApiProperty({
    description: 'Transaction timestamp (ISO date-time string)',
    example: '2026-03-15T10:30:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  transactionAt!: Date;
}
