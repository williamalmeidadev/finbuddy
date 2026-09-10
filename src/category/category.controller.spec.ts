import { Test, TestingModule } from '@nestjs/testing';
import { CategoryType } from '../generated/prisma/enums';
import { CategoryController } from './category.controller';
import { CategoryService } from './category.service';

describe('CategoryController', () => {
  let controller: CategoryController;
  let categoryService: {
    create: jest.Mock;
    findByUserId: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
  };

  beforeEach(async () => {
    categoryService = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoryController],
      providers: [
        {
          provide: CategoryService,
          useValue: categoryService,
        },
      ],
    }).compile();

    controller = module.get<CategoryController>(CategoryController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate creation to CategoryService', async () => {
      const dto = {
        name: 'Salary',
        type: CategoryType.INCOME,
      };

      const mockResponse = { id: 'cat-1', ...dto };
      categoryService.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockUser, dto);

      expect(categoryService.create).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAll', () => {
    it('should delegate search to CategoryService', async () => {
      const query = { includeInactive: true };
      const mockResponse = [{ id: 'cat-1', name: 'Salary' }];
      categoryService.findByUserId.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockUser, query);

      expect(categoryService.findByUserId).toHaveBeenCalledWith(
        mockUser.id,
        query,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to CategoryService', async () => {
      const mockResponse = { id: 'cat-1', name: 'Salary' };
      categoryService.findById.mockResolvedValue(mockResponse);

      const result = await controller.findOne(mockUser, 'cat-1');

      expect(categoryService.findById).toHaveBeenCalledWith(
        'cat-1',
        mockUser.id,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should delegate update to CategoryService', async () => {
      const dto = { name: 'Updated Salary' };
      const mockResponse = { id: 'cat-1', name: 'Updated Salary' };
      categoryService.update.mockResolvedValue(mockResponse);

      const result = await controller.update(mockUser, 'cat-1', dto);

      expect(categoryService.update).toHaveBeenCalledWith(
        'cat-1',
        mockUser.id,
        dto,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deactivate', () => {
    it('should delegate deactivate to CategoryService', async () => {
      const mockResponse = { id: 'cat-1', isActive: false };
      categoryService.deactivate.mockResolvedValue(mockResponse);

      const result = await controller.deactivate(mockUser, 'cat-1');

      expect(categoryService.deactivate).toHaveBeenCalledWith(
        'cat-1',
        mockUser.id,
      );
      expect(result).toEqual(mockResponse);
    });
  });
});
