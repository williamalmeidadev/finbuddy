import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { CategoryRepository } from './category.repository';
import { CategoryType } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';

describe('CategoryRepository', () => {
  let repository: CategoryRepository;

  const prismaMock = {
    category: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryRepository,
        {
          provide: DatabaseService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    repository = module.get<CategoryRepository>(CategoryRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const data: Prisma.CategoryUncheckedCreateInput = {
        userId: 'user-1',
        name: 'Salary',
        type: CategoryType.INCOME,
        icon: 'wallet',
        color: '#00FF00',
      };

      const created = {
        id: 'cat-1',
        ...data,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.category.create.mockResolvedValue(created);

      const result = await repository.create(data);

      expect(prismaMock.category.create).toHaveBeenCalledWith({ data });
      expect(result).toEqual(created);
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return category when found', async () => {
      const category = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        type: CategoryType.EXPENSE,
        isActive: true,
      };

      prismaMock.category.findFirst.mockResolvedValue(category);

      const result = await repository.findByIdAndUserId('cat-1', 'user-1');

      expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
        where: { id: 'cat-1', userId: 'user-1' },
      });
      expect(result).toEqual(category);
    });

    it('should return null when category not found', async () => {
      prismaMock.category.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdAndUserId('cat-404', 'user-1');

      expect(result).toBeNull();
    });
  });

  describe('findByNameAndUserId', () => {
    it('should return category by case-insensitive name, userId, and type', async () => {
      const category = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        type: CategoryType.EXPENSE,
      };

      prismaMock.category.findFirst.mockResolvedValue(category);

      const result = await repository.findByNameAndUserId(
        'food',
        'user-1',
        CategoryType.EXPENSE,
      );

      expect(prismaMock.category.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          name: { equals: 'food', mode: 'insensitive' },
          type: CategoryType.EXPENSE,
        },
      });
      expect(result).toEqual(category);
    });
  });

  describe('findByUserId', () => {
    it('should return active categories by default', async () => {
      const categories = [
        { id: 'cat-1', userId: 'user-1', name: 'Food', isActive: true },
      ];

      prismaMock.category.findMany.mockResolvedValue(categories);

      const result = await repository.findByUserId('user-1');

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(categories);
    });

    it('should include inactive categories when option is true', async () => {
      const categories = [
        { id: 'cat-1', userId: 'user-1', name: 'Food', isActive: false },
      ];

      prismaMock.category.findMany.mockResolvedValue(categories);

      const result = await repository.findByUserId('user-1', {
        includeInactive: true,
      });

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(categories);
    });

    it('should filter by category type if specified', async () => {
      const categories = [
        {
          id: 'cat-1',
          userId: 'user-1',
          name: 'Salary',
          type: CategoryType.INCOME,
          isActive: true,
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(categories);

      const result = await repository.findByUserId('user-1', {
        type: CategoryType.INCOME,
      });

      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isActive: true, type: CategoryType.INCOME },
        orderBy: { name: 'asc' },
      });
      expect(result).toEqual(categories);
    });
  });

  describe('update', () => {
    it('should update category if owned by user', async () => {
      const existing = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        isActive: true,
      };
      const updated = { ...existing, name: 'Groceries' };

      prismaMock.category.findFirst.mockResolvedValue(existing);
      prismaMock.category.update.mockResolvedValue(updated);

      const result = await repository.update('cat-1', 'user-1', {
        name: 'Groceries',
      });

      expect(result).toEqual(updated);
    });

    it('should return null if category does not exist or not owned by user', async () => {
      prismaMock.category.findFirst.mockResolvedValue(null);

      const result = await repository.update('cat-1', 'user-1', {
        name: 'Groceries',
      });

      expect(result).toBeNull();
      expect(prismaMock.category.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should set isActive to false', async () => {
      const existing = {
        id: 'cat-1',
        userId: 'user-1',
        name: 'Food',
        isActive: true,
      };
      const deactivated = { ...existing, isActive: false };

      prismaMock.category.findFirst.mockResolvedValue(existing);
      prismaMock.category.update.mockResolvedValue(deactivated);

      const result = await repository.deactivate('cat-1', 'user-1');

      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { isActive: false },
      });
      expect(result).toEqual(deactivated);
    });
  });
});
