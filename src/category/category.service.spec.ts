import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CategoryType } from '../generated/prisma/enums';
import { CategoryRepository } from './category.repository';
import { CategoryService } from './category.service';
import { CategoryResponseDto } from './dto/category-response.dto';

describe('CategoryService', () => {
  let service: CategoryService;
  let categoryRepository: {
    create: jest.Mock;
    findByIdAndUserId: jest.Mock;
    findByNameAndUserId: jest.Mock;
    findByUserId: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    categoryRepository = {
      create: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByNameAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        {
          provide: CategoryRepository,
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a category if name does not exist', async () => {
      const dto = {
        name: 'Salary',
        type: CategoryType.INCOME,
        color: '#00FF00',
        icon: 'wallet',
      };

      categoryRepository.findByNameAndUserId.mockResolvedValue(null);
      categoryRepository.create.mockResolvedValue({
        id: 'cat-1',
        userId,
        ...dto,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.create(userId, dto);

      expect(categoryRepository.findByNameAndUserId).toHaveBeenCalledWith(
        'Salary',
        userId,
        CategoryType.INCOME,
      );
      expect(result).toBeInstanceOf(CategoryResponseDto);
      expect(result.name).toBe('Salary');
    });

    it('should throw ConflictException if active category with same name and type exists', async () => {
      categoryRepository.findByNameAndUserId.mockResolvedValue({
        id: 'cat-1',
        name: 'Salary',
        type: CategoryType.INCOME,
        isActive: true,
      });

      await expect(
        service.create(userId, {
          name: 'Salary',
          type: CategoryType.INCOME,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findByUserId', () => {
    it('should return list of category DTOs', async () => {
      categoryRepository.findByUserId.mockResolvedValue([
        {
          id: 'cat-1',
          userId,
          name: 'Food',
          type: CategoryType.EXPENSE,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.findByUserId(userId);

      expect(result).toHaveLength(1);
      expect(result[0]).toBeInstanceOf(CategoryResponseDto);
    });
  });

  describe('findById', () => {
    it('should return category DTO when found', async () => {
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        name: 'Food',
        type: CategoryType.EXPENSE,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.findById('cat-1', userId);

      expect(result).toBeInstanceOf(CategoryResponseDto);
      expect(result.id).toBe('cat-1');
    });

    it('should throw NotFoundException when category not found', async () => {
      categoryRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById('cat-404', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update category when valid', async () => {
      const existing = {
        id: 'cat-1',
        userId,
        name: 'Food',
        type: CategoryType.EXPENSE,
        isActive: true,
      };

      categoryRepository.findByIdAndUserId.mockResolvedValue(existing);
      categoryRepository.findByNameAndUserId.mockResolvedValue(null);
      categoryRepository.update.mockResolvedValue({
        ...existing,
        name: 'Groceries',
        updatedAt: new Date(),
      });

      const result = await service.update('cat-1', userId, {
        name: 'Groceries',
      });

      expect(result.name).toBe('Groceries');
    });

    it('should throw NotFoundException if updating non-existent category', async () => {
      categoryRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.update('cat-404', userId, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if updated name conflicts with existing active category', async () => {
      const existing = {
        id: 'cat-1',
        userId,
        name: 'Food',
        type: CategoryType.EXPENSE,
        isActive: true,
      };

      categoryRepository.findByIdAndUserId.mockResolvedValue(existing);
      categoryRepository.findByNameAndUserId.mockResolvedValue({
        id: 'cat-2',
        name: 'Groceries',
        type: CategoryType.EXPENSE,
        isActive: true,
      });

      await expect(
        service.update('cat-1', userId, { name: 'Groceries' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate category', async () => {
      categoryRepository.deactivate.mockResolvedValue({
        id: 'cat-1',
        userId,
        name: 'Food',
        type: CategoryType.EXPENSE,
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.deactivate('cat-1', userId);

      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException if category not found', async () => {
      categoryRepository.deactivate.mockResolvedValue(null);

      await expect(service.deactivate('cat-404', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
