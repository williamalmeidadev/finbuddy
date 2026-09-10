import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { CategoryModule } from '../category/category.module';
import { DatabaseModule } from '../database/database.module';
import { RecurringTransactionExecutionController } from './recurring-transaction-execution.controller';
import { RecurringTransactionExecutionRepository } from './recurring-transaction-execution.repository';
import { RecurringTransactionExecutionService } from './recurring-transaction-execution.service';

@Module({
  imports: [DatabaseModule, AccountModule, CategoryModule],
  controllers: [RecurringTransactionExecutionController],
  providers: [
    RecurringTransactionExecutionService,
    RecurringTransactionExecutionRepository,
  ],
  exports: [
    RecurringTransactionExecutionService,
    RecurringTransactionExecutionRepository,
  ],
})
export class RecurringTransactionExecutionModule {}
