import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class ExecuteRecurringTransactionDto {
  @ApiPropertyOptional({
    description:
      'Cutoff date (YYYY-MM-DD) until which recurring transactions will be executed (defaults to today)',
    example: '2026-03-15',
  })
  @IsOptional()
  @IsDateString()
  until?: string;
}
