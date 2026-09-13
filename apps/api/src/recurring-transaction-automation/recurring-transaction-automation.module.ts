import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { RecurringTransactionExecutionModule } from '../recurring-transaction-execution/recurring-transaction-execution.module';
import { RecurringTransactionAutomationScheduler } from './recurring-transaction-automation.scheduler';
import { RecurringTransactionAutomationService } from './recurring-transaction-automation.service';

@Module({
  imports: [
    ConfigModule,
    ScheduleModule.forRoot(),
    RecurringTransactionExecutionModule,
  ],
  providers: [
    RecurringTransactionAutomationService,
    RecurringTransactionAutomationScheduler,
  ],
  exports: [
    RecurringTransactionAutomationService,
    RecurringTransactionAutomationScheduler,
  ],
})
export class RecurringTransactionAutomationModule {}
