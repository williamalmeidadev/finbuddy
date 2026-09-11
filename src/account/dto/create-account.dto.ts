import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { AccountType } from '../../generated/prisma/enums';

export class CreateAccountDto {
  @ApiProperty({
    description: 'Account display name',
    example: 'Main Checking Account',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 100)
  name!: string;

  @ApiProperty({
    description: 'Financial account type',
    enum: AccountType,
    example: 'CHECKING',
  })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({
    description: 'Initial account balance (defaults to 0)',
    example: 1500.5,
    default: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(-999999999999.9999)
  @Max(999999999999.9999)
  balance?: number;

  @ApiPropertyOptional({
    description: '3-letter uppercase ISO currency code (defaults to BRL)',
    example: 'BRL',
    default: 'BRL',
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

  @ApiProperty({
    description: 'Hex color code for UI rendering',
    example: '#820AD1',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color code (e.g. #820AD1)',
  })
  color!: string;

  @ApiPropertyOptional({
    description: 'Whether the account is active (defaults to true)',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
