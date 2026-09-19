import { Test, TestingModule } from '@nestjs/testing';
import { CreateBudgetTool } from './create-budget.tool';
import { BudgetService } from '../../../../budget/budget.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('CreateBudgetTool', () => {
  let tool: CreateBudgetTool;

  const mockBudgetService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateBudgetTool,
        {
          provide: BudgetService,
          useValue: mockBudgetService,
        },
      ],
    }).compile();

    tool = module.get<CreateBudgetTool>(CreateBudgetTool);
  });

  it('should be defined with correct metadata', () => {
    expect(tool.name).toBe('create_budget');
    expect(tool.capability).toBe(AgentCapability.CREATE_BUDGET);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.MEDIUM);
    expect(tool.requiresConfirmation).toBe(true);
  });

  it('should create a budget for the user', async () => {
    const mockBudget = {
      id: 'b-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 300,
      month: '2026-09-01T00:00:00.000Z',
      spent: 0,
    };
    mockBudgetService.create.mockResolvedValue(mockBudget);

    const result = await tool.execute(
      { userId: 'user-1' },
      { categoryId: 'cat-1', amount: 300, month: '2026-09' },
    );

    expect(mockBudgetService.create).toHaveBeenCalledWith('user-1', {
      categoryId: 'cat-1',
      amount: 300,
      month: '2026-09',
    });
    expect(result).toEqual({
      success: true,
      data: mockBudget,
    });
  });

  it('should handle creation errors gracefully', async () => {
    mockBudgetService.create.mockRejectedValue(new Error('Category not found'));

    const result = await tool.execute(
      { userId: 'user-1' },
      { categoryId: 'invalid-id', amount: 300, month: '2026-09' },
    );

    expect(result).toEqual({
      success: false,
      error: 'Category not found',
    });
  });
});
