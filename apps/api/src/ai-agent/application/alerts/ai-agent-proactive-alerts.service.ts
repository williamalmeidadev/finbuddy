import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BudgetRepository } from '../../../budget/budget.repository';

export interface BudgetAlert {
  budgetId: string;
  userId: string;
  categoryId: string;
  amountLimit: number;
  currentSpending: number;
  percentageUsed: number;
  alertLevel: 'WARNING' | 'CRITICAL' | 'EXCEEDED';
  message: string;
}

@Injectable()
export class AiAgentProactiveAlertsService {
  private readonly logger = new Logger(AiAgentProactiveAlertsService.name);

  constructor(private readonly budgetRepository: BudgetRepository) {}

  async checkUserBudgetAlerts(userId: string): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];
    const now = new Date();
    const startOfMonth = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    const budgets = await this.budgetRepository.findByUserId(userId, {
      month: startOfMonth,
    });

    for (const budget of budgets) {
      const spending = await this.budgetRepository.calculateSpending(
        userId,
        budget.categoryId,
        startOfMonth,
      );

      const limit =
        typeof budget.amount === 'number'
          ? budget.amount
          : Number(budget.amount);
      if (limit <= 0) continue;

      const percentageUsed = Math.round((spending / limit) * 100);

      if (percentageUsed >= 100) {
        alerts.push({
          budgetId: budget.id,
          userId,
          categoryId: budget.categoryId,
          amountLimit: limit,
          currentSpending: spending,
          percentageUsed,
          alertLevel: 'EXCEEDED',
          message: `⚠️ Orçamento estourado (${percentageUsed}% utilizado): gasto R$ ${spending.toFixed(2)} de R$ ${limit.toFixed(2)}`,
        });
      } else if (percentageUsed >= 80) {
        alerts.push({
          budgetId: budget.id,
          userId,
          categoryId: budget.categoryId,
          amountLimit: limit,
          currentSpending: spending,
          percentageUsed,
          alertLevel: percentageUsed >= 90 ? 'CRITICAL' : 'WARNING',
          message: `⚡ Alerta de Orçamento (${percentageUsed}% utilizado): gasto R$ ${spending.toFixed(2)} de R$ ${limit.toFixed(2)}`,
        });
      }
    }

    if (alerts.length > 0) {
      this.logger.log(
        `Proactive budget alerts triggered: user=${userId}, alertsCount=${alerts.length}`,
      );
    }

    return alerts;
  }

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async runScheduledBudgetHealthChecks(): Promise<void> {
    this.logger.log('Executing daily proactive budget health check cron job');
  }
}
