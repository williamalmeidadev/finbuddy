import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { CategoryModule } from '../category/category.module';
import { DatabaseModule } from '../database/database.module';
import { RecurringTransactionController } from './recurring-transaction.controller';
import { RecurringTransactionRepository } from './recurring-transaction.repository';
import { RecurringTransactionService } from './recurring-transaction.service';

@Module({
  imports: [DatabaseModule, AccountModule, CategoryModule],
  controllers: [RecurringTransactionController],
  providers: [RecurringTransactionRepository, RecurringTransactionService],
  exports: [RecurringTransactionService, RecurringTransactionRepository],
})
export class RecurringTransactionModule {}
