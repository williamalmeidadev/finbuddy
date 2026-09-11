import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  RecurrenceFrequency,
  TransactionType,
} from '../../generated/prisma/enums';

export class RecurringTransactionQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by account UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({
    description: 'Filter by category UUID',
    example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by transaction type',
    enum: TransactionType,
    example: 'EXPENSE',
  })
  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'Filter by recurrence frequency',
    enum: RecurrenceFrequency,
    example: 'MONTHLY',
  })
  @IsEnum(RecurrenceFrequency)
  @IsOptional()
  frequency?: RecurrenceFrequency;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;
}
