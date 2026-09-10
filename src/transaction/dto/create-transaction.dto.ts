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
  @IsUUID()
  @IsNotEmpty()
  accountId!: string;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  amount!: number;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 255)
  description?: string;

  @IsEnum(TransactionSource)
  @IsOptional()
  source?: TransactionSource;

  @Type(() => Date)
  @IsDate()
  transactionAt!: Date;
}
