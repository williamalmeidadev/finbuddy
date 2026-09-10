import { Test, TestingModule } from '@nestjs/testing';
import { BudgetController } from './budget.controller';
import { BudgetService } from './budget.service';

describe('BudgetController', () => {
  let controller: BudgetController;
  let budgetService: {
    create: jest.Mock;
    findByUserId: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
  };

  beforeEach(async () => {
    budgetService = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetController],
      providers: [
        {
          provide: BudgetService,
          useValue: budgetService,
        },
      ],
    }).compile();

    controller = module.get<BudgetController>(BudgetController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate creation to BudgetService', async () => {
      const dto = {
        categoryId: 'cat-1',
        amount: 800,
        month: '2026-09',
      };

      const mockResponse = { id: 'budget-1', ...dto };
      budgetService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockUser, dto);

      expect(budgetService.create).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAll', () => {
    it('should delegate search to BudgetService', async () => {
      const query = { month: '2026-09' };
      const mockResponse = [{ id: 'budget-1', amount: 800 }];
      budgetService.findByUserId.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockUser, query);

      expect(budgetService.findByUserId).toHaveBeenCalledWith(
        mockUser.id,
        query,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to BudgetService', async () => {
      const mockResponse = { id: 'budget-1', amount: 800 };
      budgetService.findById.mockResolvedValue(mockResponse);

      const result = await controller.findOne(mockUser, 'budget-1');

      expect(budgetService.findById).toHaveBeenCalledWith('budget-1', mockUser.id);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should delegate update to BudgetService', async () => {
      const dto = { amount: 1200 };
      const mockResponse = { id: 'budget-1', amount: 1200 };
      budgetService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(mockUser, 'budget-1', dto);

      expect(budgetService.update).toHaveBeenCalledWith(
        'budget-1',
        mockUser.id,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('remove', () => {
    it('should delegate delete to BudgetService', async () => {
      const mockResponse = { id: 'budget-1' };
      budgetService.delete.mockResolvedValue(mockResponse);

      const result = await controller.remove(mockUser, 'budget-1');

      expect(budgetService.delete).toHaveBeenCalledWith('budget-1', mockUser.id);
      expect(result).toEqual(mockResponse);
    });
  });
});
