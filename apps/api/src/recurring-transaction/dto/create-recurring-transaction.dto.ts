import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import {
  RecurrenceFrequency,
  TransactionType,
} from '../../generated/prisma/enums';

export class CreateRecurringTransactionDto {
  @ApiProperty({
    description: 'Account UUID associated with recurring transaction',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @ApiPropertyOptional({
    description: 'Category UUID associated with recurring transaction',
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
  @IsNotEmpty()
  type!: TransactionType;

  @ApiProperty({
    description: 'Recurring transaction amount (positive number)',
    example: 19.99,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount!: number;

  @ApiPropertyOptional({
    description: 'Recurring transaction description',
    example: 'Monthly streaming service subscription',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Recurrence frequency (DAILY, WEEKLY, MONTHLY, YEARLY)',
    enum: RecurrenceFrequency,
    example: 'MONTHLY',
  })
  @IsEnum(RecurrenceFrequency)
  @IsNotEmpty()
  frequency!: RecurrenceFrequency;

  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2026-03-01',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate!: string;

  @ApiPropertyOptional({
    description: 'End date in YYYY-MM-DD format (optional)',
    example: '2026-12-31',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate?: string;
}
