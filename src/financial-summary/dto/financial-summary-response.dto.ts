export interface AccountSummaryItem {
  id: string;
  name: string;
  type: string;
  balance: number;
  currency: string;
}

export interface CategorySummaryItem {
  categoryId: string;
  categoryName: string;
  amount: number;
  percentage: number;
}

export interface BudgetSummaryItem {
  id: string;
  categoryId: string;
  amount: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
}

export class FinancialSummaryResponseDto {
  period: {
    month: string;
  };
  summary: {
    income: number;
    expenses: number;
    net: number;
  };
  accounts: {
    totalBalance: number;
    items: AccountSummaryItem[];
  };
  categories: {
    income: CategorySummaryItem[];
    expenses: CategorySummaryItem[];
  };
  budgets: BudgetSummaryItem[];

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
