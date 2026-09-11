import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category display name',
    example: 'Groceries',
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
    description: 'Category transaction type',
    enum: CategoryType,
    example: 'EXPENSE',
  })
  @IsEnum(CategoryType)
  type!: CategoryType;

  @ApiPropertyOptional({
    description: 'Icon identifier or slug',
    example: 'shopping-cart',
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
    description: 'Hex color code for UI rendering',
    example: '#FF5733',
  })
  @IsString()
  @IsOptional()
  @Matches(/^#[0-9A-Fa-f]{6}$/, {
    message: 'color must be a valid hex color code (e.g. #820AD1)',
  })
  color?: string;

  @ApiPropertyOptional({
    description: 'Whether the category is active (defaults to true)',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
