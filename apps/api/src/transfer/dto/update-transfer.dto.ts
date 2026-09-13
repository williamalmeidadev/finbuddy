import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDate,
  IsNumber,
  IsOptional,
  IsPositive,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTransferDto {
  @ApiPropertyOptional({
    description: 'Updated transfer amount (positive number)',
    example: 150.0,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  @Min(0.0001)
  @Max(999999999999.9999)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Updated transfer occurrence timestamp',
    example: '2026-09-13T15:30:00Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  transactionAt?: Date;

  @ApiPropertyOptional({
    description: 'Updated source account UUID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsOptional()
  @IsUUID()
  fromAccountId?: string;

  @ApiPropertyOptional({
    description: 'Updated destination account UUID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsOptional()
  @IsUUID()
  toAccountId?: string;
}
