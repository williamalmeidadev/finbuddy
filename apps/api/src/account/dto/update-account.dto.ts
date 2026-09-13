import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { AccountType } from '../../generated/prisma/enums';

export class UpdateAccountDto {
  @ApiPropertyOptional({
    description: 'Updated account display name',
    example: 'New Savings Account',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 100)
  name?: string;

  @ApiPropertyOptional({
    description: 'Updated account type',
    enum: AccountType,
    example: 'SAVINGS',
  })
  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @ApiPropertyOptional({
    description: 'Updated 3-letter uppercase ISO currency code',
    example: 'USD',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @Matches(/^[A-Z]{3}$/, {
    message:
      'currency must be a valid 3-letter uppercase ISO currency code (e.g. BRL)',
  })
  currency?: string;

  @ApiPropertyOptional({
    description: 'Updated hex color code',
    example: '#10B981',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color code (e.g. #820AD1)',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Updated account active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
