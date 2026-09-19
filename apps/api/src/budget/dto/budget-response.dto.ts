import { ApiProperty } from '@nestjs/swagger';

interface PrismaDecimal {
  toNumber(): number;
}

export class BudgetResponseDto {
  @ApiProperty({
    description: 'Unique budget identifier (UUID)',
    example: 'b1u2d3g4-e5t6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Category UUID targeted by this budget',
    example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
  })
  categoryId: string;

  @ApiProperty({
    description: 'Budget limit amount (number)',
    example: 500.0,
  })
  amount: number;

  @ApiProperty({
    description: 'Budget month (YYYY-MM-DD or YYYY-MM)',
    example: '2026-03-01',
  })
  month: string;

  @ApiProperty({
    description: 'Total amount spent in category for this month (number)',
    example: 125.5,
  })
  spent: number;

  @ApiProperty({
    description: 'Remaining budget amount (number)',
    example: 374.5,
  })
  remaining: number;

  @ApiProperty({
    description: 'Percentage of budget used (0-100+)',
    example: 25.1,
  })
  percentageUsed: number;

  @ApiProperty({
    description: 'Budget creation timestamp',
    example: '2026-03-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Budget last update timestamp',
    example: '2026-03-01T00:00:00.000Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Category associated with budget',
    required: false,
  })
  category?: { id: string; name: string; type?: string; color?: string };

  constructor(
    budget: {
      id: string;
      categoryId: string;
      amount: PrismaDecimal | number;
      month: Date | string;
      createdAt: Date;
      updatedAt: Date;
      category?: { id: string; name: string; type?: string; color?: string | null };
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

    if (budget.category) {
      this.category = {
        id: budget.category.id,
        name: budget.category.name,
        type: budget.category.type,
        color: budget.category.color ?? undefined,
      };
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
