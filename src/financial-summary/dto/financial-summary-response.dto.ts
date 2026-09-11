import { ApiProperty } from '@nestjs/swagger';

export class AccountSummaryItemDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Main Checking' })
  name: string;

  @ApiProperty({ example: 'CHECKING' })
  type: string;

  @ApiProperty({ example: 1500.5 })
  balance: number;

  @ApiProperty({ example: 'BRL' })
  currency: string;
}

export class CategorySummaryItemDto {
  @ApiProperty({ example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890' })
  categoryId: string;

  @ApiProperty({ example: 'Groceries' })
  categoryName: string;

  @ApiProperty({ example: 450.0 })
  amount: number;

  @ApiProperty({ example: 35.5 })
  percentage: number;
}

export class BudgetSummaryItemDto {
  @ApiProperty({ example: 'b1u2d3g4-e5t6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890' })
  categoryId: string;

  @ApiProperty({ example: 500.0 })
  amount: number;

  @ApiProperty({ example: 125.5 })
  spent: number;

  @ApiProperty({ example: 374.5 })
  remaining: number;

  @ApiProperty({ example: 25.1 })
  percentageUsed: number;
}

export class PeriodSummaryDto {
  @ApiProperty({ example: '2026-03' })
  month: string;
}

export class SummaryMetricsDto {
  @ApiProperty({ example: 2500.0 })
  income: number;

  @ApiProperty({ example: 1200.0 })
  expenses: number;

  @ApiProperty({ example: 1300.0 })
  net: number;
}

export class AccountsSummaryDto {
  @ApiProperty({ example: 5000.0 })
  totalBalance: number;

  @ApiProperty({ type: [AccountSummaryItemDto] })
  items: AccountSummaryItemDto[];
}

export class CategoriesSummaryDto {
  @ApiProperty({ type: [CategorySummaryItemDto] })
  income: CategorySummaryItemDto[];

  @ApiProperty({ type: [CategorySummaryItemDto] })
  expenses: CategorySummaryItemDto[];
}

export type AccountSummaryItem = AccountSummaryItemDto;
export type CategorySummaryItem = CategorySummaryItemDto;
export type BudgetSummaryItem = BudgetSummaryItemDto;

export class FinancialSummaryResponseDto {
  @ApiProperty({ type: PeriodSummaryDto })
  period: PeriodSummaryDto;

  @ApiProperty({ type: SummaryMetricsDto })
  summary: SummaryMetricsDto;

  @ApiProperty({ type: AccountsSummaryDto })
  accounts: AccountsSummaryDto;

  @ApiProperty({ type: CategoriesSummaryDto })
  categories: CategoriesSummaryDto;

  @ApiProperty({ type: [BudgetSummaryItemDto] })
  budgets: BudgetSummaryItemDto[];

  constructor(data: {
    month: string;
    income: number;
    expenses: number;
    accounts: AccountSummaryItem[];
    incomeCategories: CategorySummaryItem[];
    expenseCategories: CategorySummaryItem[];
    budgets: BudgetSummaryItem[];
  }) {
    const incomeNum = Number(data.income.toFixed(4));
    const expensesNum = Number(data.expenses.toFixed(4));
    const netNum = Number((incomeNum - expensesNum).toFixed(4));

    const totalBalance = data.accounts.reduce(
      (acc, item) => acc + item.balance,
      0,
    );

    this.period = {
      month: data.month,
    };
    this.summary = {
      income: incomeNum,
      expenses: expensesNum,
      net: netNum,
    };
    this.accounts = {
      totalBalance: Number(totalBalance.toFixed(4)),
      items: data.accounts,
    };
    this.categories = {
      income: data.incomeCategories,
      expenses: data.expenseCategories,
    };
    this.budgets = data.budgets;
  }
}
