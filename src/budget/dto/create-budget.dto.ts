import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({
    description: 'Category UUID for budget target',
    example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  categoryId!: string;

  @ApiProperty({
    description: 'Monthly budget target amount (positive number)',
    example: 500.0,
  })
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount!: number;

  @ApiProperty({
    description: 'Target month in YYYY-MM or YYYY-MM-01 format',
    example: '2026-03',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])(-01)?$/, {
    message: 'month must be in YYYY-MM or YYYY-MM-01 format (e.g. 2026-09)',
  })
  month!: string;
}
