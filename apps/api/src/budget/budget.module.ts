import { Module } from '@nestjs/common';
import { CategoryModule } from '../category/category.module';
import { DatabaseModule } from '../database/database.module';
import { BudgetController } from './budget.controller';
import { BudgetRepository } from './budget.repository';
import { BudgetService } from './budget.service';

@Module({
  imports: [DatabaseModule, CategoryModule],
  controllers: [BudgetController],
  providers: [BudgetRepository, BudgetService],
  exports: [BudgetService, BudgetRepository],
})
export class BudgetModule {}
