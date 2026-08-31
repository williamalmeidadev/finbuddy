import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Length, Matches } from 'class-validator';
import { AccountType } from '../../generated/prisma/enums';

export class CreateAccountDto {
  @IsString()
  @Length(1, 100)
  name!: string;

  @IsEnum(AccountType)
  type!: AccountType;

  @IsNumber()
  @IsOptional()
  balance?: number;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color code (e.g. #FFFFFF)',
  })
  color!: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
