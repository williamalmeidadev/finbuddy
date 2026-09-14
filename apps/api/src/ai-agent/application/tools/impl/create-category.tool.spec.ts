import { Test, TestingModule } from '@nestjs/testing';
import { CreateCategoryTool } from './create-category.tool';
import { CategoryService } from '../../../../category/category.service';
import { CategoryType } from '../../../../generated/prisma/enums';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('CreateCategoryTool', () => {
  let tool: CreateCategoryTool;

  const mockCategoryService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateCategoryTool,
        {
          provide: CategoryService,
          useValue: mockCategoryService,
        },
      ],
    }).compile();

    tool = module.get<CreateCategoryTool>(CreateCategoryTool);
  });

  it('should be defined with correct metadata', () => {
    expect(tool.name).toBe('create_category');
    expect(tool.capability).toBe(AgentCapability.CREATE_CATEGORY);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.MEDIUM);
    expect(tool.requiresConfirmation).toBe(true);
  });

  it('should create category for user', async () => {
    const mockCategory = {
      id: 'cat-2',
      userId: 'user-1',
      name: 'Mercado',
      type: CategoryType.EXPENSE,
      icon: 'Folder',
      color: '#64748B',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockCategoryService.create.mockResolvedValue(mockCategory);

    const result = await tool.execute(
      { userId: 'user-1' },
      { name: 'Mercado', type: 'EXPENSE' },
    );

    expect(mockCategoryService.create).toHaveBeenCalledWith('user-1', {
      name: 'Mercado',
      type: CategoryType.EXPENSE,
      icon: 'Folder',
      color: '#64748B',
    });
    expect(result).toEqual({
      success: true,
      data: mockCategory,
    });
  });

  it('should handle creation errors gracefully', async () => {
    mockCategoryService.create.mockRejectedValue(new Error('Already exists'));

    const result = await tool.execute(
      { userId: 'user-1' },
      { name: 'Mercado', type: 'EXPENSE' },
    );

    expect(result).toEqual({
      success: false,
      error: 'Already exists',
    });
  });
});
