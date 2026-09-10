import { IsDateString, IsOptional } from 'class-validator';

export class ExecuteRecurringTransactionDto {
  @IsOptional()
  @IsDateString()
  until?: string;
}
