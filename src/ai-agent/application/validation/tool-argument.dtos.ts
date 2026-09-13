import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { AiMemoryType, TransactionType } from '../../../generated/prisma/enums';

export class GetAccountsArgsDto {}

export class GetTransactionsArgsDto {
  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class GetFinancialSummaryArgsDto {
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}

export class GetBudgetsArgsDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}

export class CreateTransactionArgsDto {
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  amount!: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 255)
  description?: string;

  @IsISO8601(
    {},
    { message: 'transactionAt must be a valid ISO 8601 datetime string' },
  )
  transactionAt!: string;
}

export class SaveMemoryArgsDto {
  @IsEnum(AiMemoryType)
  type!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  key!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  value!: string;
}

export class UpdateTransactionArgsDto {
  @IsUUID()
  @IsNotEmpty()
  transactionId!: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  amount?: number;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 255)
  description?: string;

  @IsOptional()
  @IsISO8601(
    {},
    { message: 'transactionAt must be a valid ISO 8601 datetime string' },
  )
  transactionAt?: string;
}
