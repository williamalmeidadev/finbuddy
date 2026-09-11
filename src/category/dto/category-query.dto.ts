import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from '../../generated/prisma/enums';

export class CategoryQueryDto {
  @ApiPropertyOptional({
    description: 'Filter categories by transaction type',
    enum: CategoryType,
    example: 'EXPENSE',
  })
  @IsEnum(CategoryType)
  @IsOptional()
  type?: CategoryType;

  @ApiPropertyOptional({
    description: 'Whether to include inactive/deactivated categories',
    example: false,
    default: false,
  })
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
