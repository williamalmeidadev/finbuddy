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
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 100)
  name!: string;

  @IsEnum(CategoryType)
  type!: CategoryType;

  @IsString()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 50)
  icon?: string;

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
