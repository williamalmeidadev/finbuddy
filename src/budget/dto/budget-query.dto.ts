import { IsOptional, IsString, IsUUID, Matches } from 'class-validator';

export class BudgetQueryDto {
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])(-01)?$/, {
    message: 'month must be in YYYY-MM format',
  })
  month?: string;
}
