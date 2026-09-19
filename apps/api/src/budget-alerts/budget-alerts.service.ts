import { Injectable, Logger } from '@nestjs/common';
import { BudgetRepository } from '../budget/budget.repository';
import { CategoryRepository } from '../category/category.repository';
import { BudgetAlertDto, BudgetAlertLevel } from './dto/budget-alert.dto';

@Injectable()
export class BudgetAlertsService {
  private readonly logger = new Logger(BudgetAlertsService.name);

  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async evaluateTransactionAlert(
    userId: string,
    categoryId?: string | null,
    transactionAt?: Date | string | null,
  ): Promise<BudgetAlertDto | null> {
    if (!userId || !categoryId) {
      return null;
    }

    try {
      const date = transactionAt ? new Date(transactionAt) : new Date();
      const validDate = isNaN(date.getTime()) ? new Date() : date;
      const startOfMonth = new Date(
        Date.UTC(validDate.getUTCFullYear(), validDate.getUTCMonth(), 1),
      );

      const budget = await this.budgetRepository.findByCategoryMonthAndUserId(
        categoryId,
        startOfMonth,
        userId,
      );

      if (!budget) {
        return null;
      }

      const spending = await this.budgetRepository.calculateSpending(
        userId,
        categoryId,
        startOfMonth,
      );

      const limit =
        typeof budget.amount === 'number'
          ? budget.amount
          : Number(budget.amount);

      if (limit <= 0) {
        return null;
      }

      const percentageUsed = Math.round((spending / limit) * 100);

      if (percentageUsed < 50) {
        return null;
      }

      let categoryName = (budget as { category?: { name?: string } }).category?.name;
      if (!categoryName) {
        const category = await this.categoryRepository.findByIdAndUserId(
          categoryId,
          userId,
        );
        categoryName = category?.name ?? 'Categoria';
      }

      let alertLevel: BudgetAlertLevel;
      let icon: string;

      if (percentageUsed >= 100) {
        alertLevel = 'EXCEEDED';
        icon = '⚠️';
      } else if (percentageUsed >= 90) {
        alertLevel = 'CRITICAL';
        icon = '⚡';
      } else {
        alertLevel = 'INFO';
        icon = 'ℹ️';
      }

      const statusText =
        alertLevel === 'EXCEEDED'
          ? 'Orçamento estourado'
          : alertLevel === 'CRITICAL'
            ? 'Alerta Crítico de Orçamento'
            : 'Atenção ao Orçamento';

      const message = `${icon} ${statusText} para "${categoryName}" (${percentageUsed}% utilizado): gasto R$ ${spending.toFixed(2)} de R$ ${limit.toFixed(2)}`;

      this.logger.log(
        `Budget alert triggered: user=${userId}, category=${categoryName}, alertLevel=${alertLevel}, percentageUsed=${percentageUsed}%`,
      );

      return {
        budgetId: budget.id,
        userId,
        categoryId,
        categoryName,
        amountLimit: limit,
        currentSpending: spending,
        percentageUsed,
        alertLevel,
        message,
      };
    } catch (error: unknown) {
      this.logger.error(
        `Failed to evaluate budget alert for user ${userId}, category ${categoryId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return null;
    }
  }
}
