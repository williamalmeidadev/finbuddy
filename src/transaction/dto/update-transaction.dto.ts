import { ApiPropertyOptional } from '@nestjs/swagger';
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
    description: 'Updated transaction amount',
    example: 52.0,
    minimum: 0.0001,
    maximum: 999999999999.9999,
  })
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number' })
  @Min(0.0001)
  @Max(999999999999.9999)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Updated description',
    example: 'Updated purchase note',
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
    description: 'Updated transaction source',
    enum: TransactionSource,
    example: 'MANUAL',
  })
  @IsEnum(TransactionSource)
  @IsOptional()
  source?: TransactionSource;

  @ApiPropertyOptional({
    description: 'Updated transaction timestamp',
    example: '2026-03-15T11:00:00.000Z',
  })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  transactionAt?: Date;
}
