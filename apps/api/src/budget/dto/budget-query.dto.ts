import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class BudgetQueryDto {
  @ApiPropertyOptional({
    description: 'Filter budgets by category UUID',
    example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter budgets by month in YYYY-MM format',
    example: '2026-03',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])(-01)?$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}
