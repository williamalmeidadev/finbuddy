import { Module } from '@nestjs/common';
import { BudgetModule } from '../budget/budget.module';
import { DatabaseModule } from '../database/database.module';
import { FinancialSummaryController } from './financial-summary.controller';
import { FinancialSummaryRepository } from './financial-summary.repository';
import { FinancialSummaryService } from './financial-summary.service';

@Module({
  imports: [DatabaseModule, BudgetModule],
  controllers: [FinancialSummaryController],
  providers: [FinancialSummaryRepository, FinancialSummaryService],
  exports: [FinancialSummaryService, FinancialSummaryRepository],
})
export class FinancialSummaryModule {}
