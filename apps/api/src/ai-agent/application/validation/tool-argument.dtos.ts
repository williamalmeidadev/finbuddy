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
import {
  CategoryType,
  AiMemoryType,
  TransactionType,
} from '../../../generated/prisma/enums';

export class GetAccountsArgsDto {}

export class GetCategoriesArgsDto {
  @IsOptional()
  @IsEnum(CategoryType)
  type?: CategoryType;
}

export class CreateCategoryArgsDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

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

  @IsOptional()
  @IsISO8601(
    {},
    { message: 'transactionAt must be a valid ISO 8601 datetime string' },
  )
  transactionAt?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  categoryName?: string;
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

export class DeleteTransactionArgsDto {
  @IsUUID()
  @IsNotEmpty()
  transactionId!: string;
}

export class CreateTransferArgsDto {
  @IsUUID()
  @IsNotEmpty()
  fromAccountId!: string;

  @IsUUID()
  @IsNotEmpty()
  toAccountId!: string;

  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  amount!: number;

  @IsOptional()
  @IsISO8601(
    {},
    { message: 'transactionAt must be a valid ISO 8601 datetime string' },
  )
  transactionAt?: string;

  @IsOptional()
  @IsString()
  fromAccountName?: string;

  @IsOptional()
  @IsString()
  toAccountName?: string;
}

export class UpdateTransferArgsDto {
  @IsUUID()
  @IsNotEmpty()
  transferId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  amount?: number;

  @IsOptional()
  @IsISO8601(
    {},
    { message: 'transactionAt must be a valid ISO 8601 datetime string' },
  )
  transactionAt?: string;

  @IsOptional()
  @IsUUID()
  fromAccountId?: string;

  @IsOptional()
  @IsUUID()
  toAccountId?: string;
}

export class DeleteTransferArgsDto {
  @IsUUID()
  @IsNotEmpty()
  transferId!: string;
}

export class CreateBudgetArgsDto {
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.01)
  @Max(999999999999.99)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])(-01)?$/, {
    message: 'month must be in YYYY-MM or YYYY-MM-01 format (e.g. 2026-09)',
  })
  month!: string;

  @IsOptional()
  @IsString()
  categoryName?: string;
}

export class UpdateBudgetArgsDto {
  @IsUUID()
  @IsNotEmpty()
  budgetId!: string;

  @Type(() => Number)
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.01)
  @Max(999999999999.99)
  amount!: number;
}

export class DeleteBudgetArgsDto {
  @IsUUID()
  @IsNotEmpty()
  budgetId!: string;
}

