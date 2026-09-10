import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateTransferDto {
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

  @Type(() => Date)
  @IsDate()
  transactionAt!: Date;
}
