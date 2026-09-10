import { IsOptional, IsUUID } from 'class-validator';

export class TransactionQueryDto {
  @IsUUID()
  @IsOptional()
  accountId?: string;
}
