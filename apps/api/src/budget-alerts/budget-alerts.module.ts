import { Module } from '@nestjs/common';
import { BudgetModule } from '../budget/budget.module';
import { CategoryModule } from '../category/category.module';
import { BudgetAlertsService } from './budget-alerts.service';

@Module({
  imports: [BudgetModule, CategoryModule],
  providers: [BudgetAlertsService],
  exports: [BudgetAlertsService],
})
export class BudgetAlertsModule {}
