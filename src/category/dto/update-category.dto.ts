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
import { CategoryType } from '../../generated/prisma/enums';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Updated category display name',
    example: 'Supermarket & Groceries',
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
    description: 'Updated category type',
    enum: CategoryType,
    example: 'EXPENSE',
  })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @ApiPropertyOptional({
    description: 'Updated icon identifier or slug',
    example: 'basket',
    maxLength: 50,
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 50)
  icon?: string;

  @ApiPropertyOptional({
    description: 'Updated hex color code',
    example: '#3357FF',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color code (e.g. #820AD1)',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Updated category active status',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
