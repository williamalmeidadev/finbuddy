import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RecurringTransactionExecutionResponseDto } from '../recurring-transaction-execution/dto/recurring-transaction-execution-response.dto';
import { RecurringTransactionExecutionService } from '../recurring-transaction-execution/recurring-transaction-execution.service';

@Injectable()
export class RecurringTransactionAutomationService {
  private readonly logger = new Logger(
    RecurringTransactionAutomationService.name,
  );

  constructor(
    private readonly configService: ConfigService,
    private readonly executionService: RecurringTransactionExecutionService,
  ) {}

  isEnabled(): boolean {
    const enabled = this.configService.get<boolean>(
      'RECURRING_TRANSACTION_AUTOMATION_ENABLED',
      true,
    );
    return enabled === true || String(enabled).toLowerCase() === 'true';
  }

  async runAutomation(): Promise<RecurringTransactionExecutionResponseDto> {
    if (!this.isEnabled()) {
      return new RecurringTransactionExecutionResponseDto();
    }

    const startTime = Date.now();
    const executionId = `exec_${startTime}`;
    this.logger.log(
      `[${executionId}] Recurring transaction automation execution started`,
    );

    try {
      const result = await this.executionService.executeAllDue();
      const durationMs = Date.now() - startTime;

      this.logger.log(
        `[${executionId}] Recurring transaction automation execution completed in ${durationMs}ms - ` +
          `processed: ${result.processed}, created: ${result.created}, skipped: ${result.skipped}, deactivated: ${result.deactivated}`,
      );

      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logger.error(
        `[${executionId}] Recurring transaction automation execution failed after ${durationMs}ms: ${(error as Error).message}`,
        (error as Error).stack,
      );

      return new RecurringTransactionExecutionResponseDto();
    }
  }
}
