export class RecurringTransactionExecutionResponseDto {
  processed: number;
  created: number;
  skipped: number;
  deactivated: number;

  constructor(partial?: Partial<RecurringTransactionExecutionResponseDto>) {
    this.processed = partial?.processed ?? 0;
    this.created = partial?.created ?? 0;
    this.skipped = partial?.skipped ?? 0;
    this.deactivated = partial?.deactivated ?? 0;
  }
}
