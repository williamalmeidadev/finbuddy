import { Transform, Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
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

export class UpdateTransactionDto {
  @IsUUID()
  @IsOptional()
  categoryId?: string | null;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  @IsOptional()
  amount?: number;

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
  @IsOptional()
  transactionAt?: Date;
}
