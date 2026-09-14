import { Test, TestingModule } from '@nestjs/testing';
import { GetCategoriesTool } from './get-categories.tool';
import { CategoryService } from '../../../../category/category.service';
import { CategoryType } from '../../../../generated/prisma/enums';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('GetCategoriesTool', () => {
  let tool: GetCategoriesTool;

  const mockCategoryService = {
    findByUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCategoriesTool,
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    tool = module.get<GetCategoriesTool>(GetCategoriesTool);
  });

  it('should be defined with correct metadata', () => {
    expect(tool.name).toBe('get_categories');
    expect(tool.capability).toBe(AgentCapability.READ_CATEGORIES);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.LOW);
    expect(tool.readOnly).toBe(true);
  });

  it('should return categories for user', async () => {
    const mockCategories = [
      {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Groceries',
        type: CategoryType.EXPENSE,
        icon: 'ShoppingCart',
        color: '#EF4444',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockCategoryService.findByUserId.mockResolvedValue(mockCategories);

    const result = await tool.execute(
      { userId: 'user-1' },
      { type: 'EXPENSE' },
    );

    expect(mockCategoryService.findByUserId).toHaveBeenCalledWith('user-1', {
      type: CategoryType.EXPENSE,
    });
    expect(result).toEqual({
      success: true,
      data: [
        {
          id: 'cat-1',
          name: 'Groceries',
          type: CategoryType.EXPENSE,
          icon: 'ShoppingCart',
          color: '#EF4444',
          isActive: true,
        },
      ],
    });
  });

  it('should handle service errors gracefully', async () => {
    mockCategoryService.findByUserId.mockRejectedValue(
      new Error('Service failure'),
    );

    const result = await tool.execute({ userId: 'user-1' });

    expect(result).toEqual({
      success: false,
      error: 'Service failure',
    });
  });
});
