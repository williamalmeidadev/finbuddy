import { ApiProperty } from '@nestjs/swagger';

export class RecurringTransactionExecutionResponseDto {
  @ApiProperty({ description: 'Number of occurrences processed', example: 3 })
  processed: number;

  @ApiProperty({
    description: 'Number of new transactions created',
    example: 3,
  })
  created: number;

  @ApiProperty({ description: 'Number of occurrences skipped', example: 0 })
  skipped: number;

  @ApiProperty({
    description: 'Number of recurring rules deactivated due to end date',
    example: 0,
  })
  deactivated: number;

  constructor(partial?: Partial<RecurringTransactionExecutionResponseDto>) {
    this.processed = partial?.processed ?? 0;
    this.created = partial?.created ?? 0;
    this.skipped = partial?.skipped ?? 0;
    this.deactivated = partial?.deactivated ?? 0;
  }
}
