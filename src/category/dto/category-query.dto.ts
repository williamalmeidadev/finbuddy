import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from '../../generated/prisma/enums';

export class CategoryQueryDto {
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : value,
  )
  includeInactive?: boolean;
}
