import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
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

export class UpdateRecurringTransactionDto {
  @ApiPropertyOptional({
    description: 'Updated account UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Updated category UUID (or null to unassign)',
    example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @ApiPropertyOptional({
    description: 'Updated transaction type',
    enum: TransactionType,
    example: 'EXPENSE',
  })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Updated recurring amount',
    example: 24.99,
  })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'Updated subscription plan',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Updated recurrence frequency',
    enum: RecurrenceFrequency,
    example: 'MONTHLY',
  })
  @IsEnum(RecurrenceFrequency)
  @IsOptional()
  frequency?: RecurrenceFrequency;

  @ApiPropertyOptional({
    description: 'Updated start date in YYYY-MM-DD format',
    example: '2026-03-01',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate?: string;

  @ApiPropertyOptional({
    description:
      'Updated end date in YYYY-MM-DD format (or null to remove end date)',
    example: '2026-12-31',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate?: string | null;

  @ApiPropertyOptional({
    description: 'Updated active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
