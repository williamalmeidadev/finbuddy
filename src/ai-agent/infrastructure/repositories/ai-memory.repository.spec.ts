import { Test, TestingModule } from '@nestjs/testing';
import { AiMemoryRepository } from './ai-memory.repository';
import { DatabaseService } from '../../../database/database.service';
import { AiMemoryType } from '../../../generated/prisma/enums';

describe('AiMemoryRepository', () => {
  let repository: AiMemoryRepository;
  let mockDatabaseService: any;

  beforeEach(async () => {
    mockDatabaseService = {
      aiMemory: {
        upsert: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMemoryRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    repository = module.get<AiMemoryRepository>(AiMemoryRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('upsertForUser', () => {
    it('should call prisma.aiMemory.upsert with correct data', async () => {
      const mockRecord = {
        id: 'mem-1',
        userId: 'u-1',
        type: AiMemoryType.PREFERENCE,
        key: 'preferred_currency',
        value: 'BRL',
      };
      mockDatabaseService.aiMemory.upsert.mockResolvedValue(mockRecord);

      const res = await repository.upsertForUser({
        userId: 'u-1',
        type: AiMemoryType.PREFERENCE,
        key: 'preferred_currency',
        value: 'BRL',
      });

      expect(res).toEqual(mockRecord);
      expect(mockDatabaseService.aiMemory.upsert).toHaveBeenCalledWith({
        where: {
          userId_type_key: {
            userId: 'u-1',
            type: AiMemoryType.PREFERENCE,
            key: 'preferred_currency',
          },
        },
        update: {
          value: 'BRL',
          updatedAt: expect.any(Date),
        },
        create: {
          userId: 'u-1',
          type: AiMemoryType.PREFERENCE,
          key: 'preferred_currency',
          value: 'BRL',
        },
      });
    });
  });

  describe('deleteById', () => {
    it('should return false if memory does not exist or belong to user', async () => {
      mockDatabaseService.aiMemory.findFirst.mockResolvedValue(null);

      const result = await repository.deleteById('mem-1', 'u-1');
      expect(result).toBe(false);
    });

    it('should delete memory and return true when owned by user', async () => {
      mockDatabaseService.aiMemory.findFirst.mockResolvedValue({
        id: 'mem-1',
        userId: 'u-1',
      });
      mockDatabaseService.aiMemory.delete.mockResolvedValue({});

      const result = await repository.deleteById('mem-1', 'u-1');
      expect(result).toBe(true);
      expect(mockDatabaseService.aiMemory.delete).toHaveBeenCalledWith({
        where: { id: 'mem-1' },
      });
    });
  });
});
