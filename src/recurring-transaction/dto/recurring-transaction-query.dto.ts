import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import {
  RecurrenceFrequency,
  TransactionType,
} from '../../generated/prisma/enums';

export class RecurringTransactionQueryDto {
  @IsUUID()
  @IsOptional()
  accountId?: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsEnum(RecurrenceFrequency)
  @IsOptional()
  frequency?: RecurrenceFrequency;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  isActive?: boolean;
}
