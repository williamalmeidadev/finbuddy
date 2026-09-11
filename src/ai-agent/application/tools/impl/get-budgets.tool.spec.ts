import { Test, TestingModule } from '@nestjs/testing';
import { GetBudgetsTool } from './get-budgets.tool';
import { BudgetService } from '../../../../budget/budget.service';

describe('GetBudgetsTool', () => {
  let tool: GetBudgetsTool;

  const mockBudgetService = {
    findByUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetBudgetsTool,
        { provide: BudgetService, useValue: mockBudgetService },
      ],
    }).compile();

    tool = module.get<GetBudgetsTool>(GetBudgetsTool);
  });

  it('should be defined with name and schema', () => {
    expect(tool.name).toBe('get_budgets');
    expect(tool.inputSchema.additionalProperties).toBe(false);
  });

  it('should pass authenticated userId and optional filters to service', async () => {
    const mockBudgets = [
      {
        id: 'b-1',
        categoryId: 'cat-1',
        month: new Date('2026-03-01'),
        amount: 500,
        spent: 200,
        remaining: 300,
        percentageUsed: 40,
      },
    ];
    mockBudgetService.findByUserId.mockResolvedValue(mockBudgets);

    const result = await tool.execute(
      { userId: 'user-123' },
      { categoryId: 'cat-1', month: '2026-03' },
    );

    expect(mockBudgetService.findByUserId).toHaveBeenCalledWith('user-123', {
      categoryId: 'cat-1',
      month: '2026-03',
    });
    expect(result).toEqual({
      success: true,
      data: mockBudgets,
    });
  });

  it('should handle errors gracefully', async () => {
    mockBudgetService.findByUserId.mockRejectedValue(
      new Error('Budget service failure'),
    );

    const result = await tool.execute({ userId: 'user-123' }, {});

    expect(result).toEqual({
      success: false,
      error: 'Budget service failure',
    });
  });
});
