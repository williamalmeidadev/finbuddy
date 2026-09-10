import { IsOptional, IsString, Matches } from 'class-validator';

export class FinancialSummaryQueryDto {
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format (e.g. 2026-09)',
  })
  month?: string;
}
