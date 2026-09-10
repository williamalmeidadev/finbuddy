import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryRepository } from '../category/category.repository';
import { CategoryType } from '../generated/prisma/enums';
import { BudgetRepository } from './budget.repository';
import { BudgetService } from './budget.service';
import { BudgetResponseDto } from './dto/budget-response.dto';

describe('BudgetService', () => {
  let service: BudgetService;
  let budgetRepository: {
    create: jest.Mock;
    findByIdAndUserId: jest.Mock;
    findByCategoryMonthAndUserId: jest.Mock;
    findByUserId: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    calculateSpending: jest.Mock;
  };
  let categoryRepository: {
    findByIdAndUserId: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    budgetRepository = {
      create: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByCategoryMonthAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      calculateSpending: jest.fn(),
    };

    categoryRepository = {
      findByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetService,
        {
          provide: BudgetRepository,
          useValue: budgetRepository,
        },
        {
          provide: CategoryRepository,
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = module.get<BudgetService>(BudgetService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a budget successfully', async () => {
      const dto = {
        categoryId: 'cat-1',
        amount: 800,
        month: '2026-09',
      };

      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        type: CategoryType.EXPENSE,
        isActive: true,
      });

      budgetRepository.findByCategoryMonthAndUserId.mockResolvedValue(null);
      budgetRepository.create.mockResolvedValue({
        id: 'budget-1',
        userId,
        categoryId: 'cat-1',
        amount: 800,
        month: new Date('2026-09-01T00:00:00.000Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      budgetRepository.calculateSpending.mockResolvedValue(300);

      const result = await service.create(userId, dto);

      expect(result).toBeInstanceOf(BudgetResponseDto);
      expect(result.amount).toBe(800);
      expect(result.spent).toBe(300);
      expect(result.remaining).toBe(500);
      expect(result.percentageUsed).toBe(37.5);
    });

    it('should throw BadRequestException if amount is zero or negative', async () => {
      await expect(
        service.create(userId, {
          categoryId: 'cat-1',
          amount: 0,
          month: '2026-09',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if category is not found or owned by another user', async () => {
      categoryRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          categoryId: 'cat-404',
          amount: 500,
          month: '2026-09',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category type is INCOME', async () => {
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-income',
        userId,
        type: CategoryType.INCOME,
        isActive: true,
      });

      await expect(
        service.create(userId, {
          categoryId: 'cat-income',
          amount: 500,
          month: '2026-09',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if category is inactive', async () => {
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-inactive',
        userId,
        type: CategoryType.EXPENSE,
        isActive: false,
      });

      await expect(
        service.create(userId, {
          categoryId: 'cat-inactive',
          amount: 500,
          month: '2026-09',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException if budget for category and month already exists', async () => {
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        type: CategoryType.EXPENSE,
        isActive: true,
      });

      budgetRepository.findByCategoryMonthAndUserId.mockResolvedValue({
        id: 'existing-budget',
      });

      await expect(
        service.create(userId, {
          categoryId: 'cat-1',
          amount: 500,
          month: '2026-09',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByUserId', () => {
    it('should return list of budget response DTOs with calculated spending', async () => {
      const mockBudgets = [
        {
          id: 'budget-1',
          userId,
          categoryId: 'cat-1',
          amount: 500,
          month: new Date('2026-09-01T00:00:00.000Z'),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      budgetRepository.findByUserId.mockResolvedValue(mockBudgets);
      budgetRepository.calculateSpending.mockResolvedValue(650);

      const result = await service.findByUserId(userId);

      expect(result).toHaveLength(1);
      expect(result[0].spent).toBe(650);
      expect(result[0].remaining).toBe(-150);
      expect(result[0].percentageUsed).toBe(130);
    });
  });

  describe('findById', () => {
    it('should return budget when found', async () => {
      budgetRepository.findByIdAndUserId.mockResolvedValue({
        id: 'budget-1',
        userId,
        categoryId: 'cat-1',
        amount: 500,
        month: new Date('2026-09-01T00:00:00.000Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      budgetRepository.calculateSpending.mockResolvedValue(200);

      const result = await service.findById('budget-1', userId);

      expect(result.id).toBe('budget-1');
      expect(result.remaining).toBe(300);
    });

    it('should throw NotFoundException when not found', async () => {
      budgetRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById('budget-404', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update budget amount', async () => {
      const existing = {
        id: 'budget-1',
        userId,
        categoryId: 'cat-1',
        amount: 500,
        month: new Date('2026-09-01T00:00:00.000Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      budgetRepository.findByIdAndUserId.mockResolvedValue(existing);
      budgetRepository.update.mockResolvedValue({
        ...existing,
        amount: 1000,
      });
      budgetRepository.calculateSpending.mockResolvedValue(200);

      const result = await service.update('budget-1', userId, { amount: 1000 });

      expect(result.amount).toBe(1000);
      expect(result.remaining).toBe(800);
    });

    it('should throw BadRequestException if update amount is <= 0', async () => {
      await expect(
        service.update('budget-1', userId, { amount: -50 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if budget to update does not exist', async () => {
      budgetRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.update('budget-404', userId, { amount: 1000 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete budget', async () => {
      const existing = {
        id: 'budget-1',
        userId,
        categoryId: 'cat-1',
        amount: 500,
        month: new Date('2026-09-01T00:00:00.000Z'),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      budgetRepository.findByIdAndUserId.mockResolvedValue(existing);
      budgetRepository.delete.mockResolvedValue(existing);
      budgetRepository.calculateSpending.mockResolvedValue(100);

      const result = await service.delete('budget-1', userId);

      expect(result.id).toBe('budget-1');
      expect(budgetRepository.delete).toHaveBeenCalledWith('budget-1', userId);
    });

    it('should throw NotFoundException if budget to delete does not exist', async () => {
      budgetRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.delete('budget-404', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
