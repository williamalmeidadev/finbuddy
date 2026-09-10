interface PrismaDecimal {
  toNumber(): number;
}

export class BudgetResponseDto {
  id: string;
  categoryId: string;
  amount: number;
  month: string;
  spent: number;
  remaining: number;
  percentageUsed: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(
    budget: {
      id: string;
      categoryId: string;
      amount: PrismaDecimal | number;
      month: Date | string;
      createdAt: Date;
      updatedAt: Date;
    },
    spent = 0,
  ) {
    this.id = budget.id;
    this.categoryId = budget.categoryId;
    this.amount =
      typeof budget.amount === 'number'
        ? budget.amount
        : budget.amount.toNumber();

    if (budget.month instanceof Date) {
      this.month = budget.month.toISOString().split('T')[0];
    } else {
      this.month = String(budget.month).split('T')[0];
    }

    const spentNum = typeof spent === 'number' ? spent : 0;
    this.spent = Number(spentNum.toFixed(4));
    this.remaining = Number((this.amount - spentNum).toFixed(4));
    this.percentageUsed =
      this.amount > 0 ? Number(((spentNum / this.amount) * 100).toFixed(2)) : 0;

    this.createdAt = budget.createdAt;
    this.updatedAt = budget.updatedAt;
  }
}
