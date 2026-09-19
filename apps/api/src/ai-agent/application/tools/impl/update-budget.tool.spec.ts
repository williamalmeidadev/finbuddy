import { Test, TestingModule } from '@nestjs/testing';
import { UpdateBudgetTool } from './update-budget.tool';
import { BudgetService } from '../../../../budget/budget.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('UpdateBudgetTool', () => {
  let tool: UpdateBudgetTool;

  const mockBudgetService = {
    update: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateBudgetTool,
        {
          provide: BudgetService,
          useValue: mockBudgetService,
        },
      ],
    }).compile();

    tool = module.get<UpdateBudgetTool>(UpdateBudgetTool);
  });

  it('should be defined with correct metadata', () => {
    expect(tool.name).toBe('update_budget');
    expect(tool.capability).toBe(AgentCapability.UPDATE_BUDGET);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.MEDIUM);
    expect(tool.requiresConfirmation).toBe(true);
  });

  it('should update a budget for the user', async () => {
    const mockBudget = {
      id: 'b-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 400,
      spent: 50,
    };
    mockBudgetService.update.mockResolvedValue(mockBudget);

    const result = await tool.execute(
      { userId: 'user-1' },
      { budgetId: 'b-1', amount: 400 },
    );

    expect(mockBudgetService.update).toHaveBeenCalledWith('b-1', 'user-1', {
      amount: 400,
    });
    expect(result).toEqual({
      success: true,
      data: mockBudget,
    });
  });

  it('should handle update errors gracefully', async () => {
    mockBudgetService.update.mockRejectedValue(new Error('Budget not found'));

    const result = await tool.execute(
      { userId: 'user-1' },
      { budgetId: 'invalid-id', amount: 400 },
    );

    expect(result).toEqual({
      success: false,
      error: 'Budget not found',
    });
  });
});
