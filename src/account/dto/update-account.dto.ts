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

export class UpdateAccountDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 100)
  name?: string;

  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @IsNumber()
  @IsOptional()
  @Min(-999999999999.9999)
  @Max(999999999999.9999)
  balance?: number;

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

  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color code (e.g. #820AD1)',
  })
  color?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
