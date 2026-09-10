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
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransactionType)
  @IsNotEmpty()
  type!: TransactionType;

  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(RecurrenceFrequency)
  @IsNotEmpty()
  frequency!: RecurrenceFrequency;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'startDate must be in YYYY-MM-DD format',
  })
  startDate!: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'endDate must be in YYYY-MM-DD format',
  })
  endDate?: string;
}
