import { ApiProperty } from '@nestjs/swagger';

export type BudgetAlertLevel = 'INFO' | 'WARNING' | 'CRITICAL' | 'EXCEEDED';

export class BudgetAlertDto {
  @ApiProperty({ description: 'Budget UUID', example: 'b1u2d3g4-e5t6-7890-abcd-ef1234567890' })
  budgetId: string;

  @ApiProperty({ description: 'User UUID', example: 'u1u2d3g4-e5t6-7890-abcd-ef1234567890' })
  userId: string;

  @ApiProperty({ description: 'Category UUID', example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890' })
  categoryId: string;

  @ApiProperty({ description: 'Category Name', example: 'Alimentação', required: false })
  categoryName?: string;

  @ApiProperty({ description: 'Budget limit amount', example: 500.0 })
  amountLimit: number;

  @ApiProperty({ description: 'Current spending in category for the month', example: 450.0 })
  currentSpending: number;

  @ApiProperty({ description: 'Percentage of budget used (0-100+)', example: 90 })
  percentageUsed: number;

  @ApiProperty({ description: 'Alert severity level', enum: ['INFO', 'WARNING', 'CRITICAL', 'EXCEEDED'] })
  alertLevel: BudgetAlertLevel;

  @ApiProperty({ description: 'User-facing alert message', example: '⚡ Alerta de Orçamento (90% utilizado): gasto R$ 450.00 de R$ 500.00' })
  message: string;
}
