import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { AccountModule } from './account/account.module';
import { TransactionModule } from './transaction/transaction.module';
import { TransferModule } from './transfer/transfer.module';
import { CategoryModule } from './category/category.module';
import { BudgetModule } from './budget/budget.module';
import { FinancialSummaryModule } from './financial-summary/financial-summary.module';
import { RecurringTransactionModule } from './recurring-transaction/recurring-transaction.module';
import { RecurringTransactionExecutionModule } from './recurring-transaction-execution/recurring-transaction-execution.module';
import { RecurringTransactionAutomationModule } from './recurring-transaction-automation/recurring-transaction-automation.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './common/metrics/metrics.module';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { RequestLoggingMiddleware } from './common/middleware/request-logging.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          name: 'default',
          ttl: configService.get<number>('THROTTLE_TTL') ?? 60000,
          limit: configService.get<number>('THROTTLE_LIMIT') ?? 100,
        },
        {
          name: 'auth',
          ttl: configService.get<number>('THROTTLE_TTL') ?? 60000,
          limit: configService.get<number>('THROTTLE_AUTH_LIMIT') ?? 10,
        },
      ],
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    AccountModule,
    TransactionModule,
    TransferModule,
    CategoryModule,
    BudgetModule,
    FinancialSummaryModule,
    RecurringTransactionModule,
    RecurringTransactionExecutionModule,
    RecurringTransactionAutomationModule,
    HealthModule,
    MetricsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, RequestLoggingMiddleware)
      .forRoutes('*');
  }
}
