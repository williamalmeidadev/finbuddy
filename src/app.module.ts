import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { UserModule } from './user/user.module';
import { AccountModule } from './account/account.module';
import { TransactionModule } from './transaction/transaction.module';
import { TransferModule } from './transfer/transfer.module';
import { CategoryModule } from './category/category.module';
import { BudgetModule } from './budget/budget.module';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    DatabaseModule,
    UserModule,
    AuthModule,
    AccountModule,
    TransactionModule,
    TransferModule,
    CategoryModule,
    BudgetModule,
  ],
})
export class AppModule {}
