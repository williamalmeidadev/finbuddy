import { Test, TestingModule } from '@nestjs/testing';
import { DeleteBudgetTool } from './delete-budget.tool';
import { BudgetService } from '../../../../budget/budget.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('DeleteBudgetTool', () => {
  let tool: DeleteBudgetTool;

  const mockBudgetService = {
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeleteBudgetTool,
        {
          provide: BudgetService,
          useValue: mockBudgetService,
        },
      ],
    }).compile();

    tool = module.get<DeleteBudgetTool>(DeleteBudgetTool);
  });

  it('should be defined with correct metadata', () => {
    expect(tool.name).toBe('delete_budget');
    expect(tool.capability).toBe(AgentCapability.DELETE_BUDGET);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.HIGH);
    expect(tool.requiresConfirmation).toBe(true);
  });

  it('should delete a budget for the user', async () => {
    const mockBudget = {
      id: 'b-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 300,
    };
    mockBudgetService.delete.mockResolvedValue(mockBudget);

    const result = await tool.execute(
      { userId: 'user-1' },
      { budgetId: 'b-1' },
    );

    expect(mockBudgetService.delete).toHaveBeenCalledWith('b-1', 'user-1');
    expect(result).toEqual({
      success: true,
      data: mockBudget,
    });
  });

  it('should handle deletion errors gracefully', async () => {
    mockBudgetService.delete.mockRejectedValue(new Error('Budget not found'));

    const result = await tool.execute(
      { userId: 'user-1' },
      { budgetId: 'invalid-id' },
    );

    expect(result).toEqual({
      success: false,
      error: 'Budget not found',
    });
  });
});
