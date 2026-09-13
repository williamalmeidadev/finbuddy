import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringTransactionAutomationService } from './recurring-transaction-automation.service';

@Injectable()
export class RecurringTransactionAutomationScheduler implements OnModuleInit {
  private readonly logger = new Logger(
    RecurringTransactionAutomationScheduler.name,
  );
  private isExecuting = false;

  constructor(
    private readonly automationService: RecurringTransactionAutomationService,
  ) {}

  onModuleInit() {
    if (this.automationService.isEnabled()) {
      this.logger.log('Recurring transaction automation scheduler started');
    } else {
      this.logger.log('Recurring transaction automation scheduler is disabled');
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    if (!this.automationService.isEnabled()) {
      return;
    }

    if (this.isExecuting) {
      this.logger.warn(
        'Previous automation cycle is still in progress, skipping scheduled tick',
      );
      return;
    }

    this.isExecuting = true;
    try {
      await this.automationService.runAutomation();
    } finally {
      this.isExecuting = false;
    }
  }
}
