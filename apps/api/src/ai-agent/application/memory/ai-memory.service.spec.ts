import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiMemoryService } from './ai-memory.service';
import { AiMemoryRepository } from '../../infrastructure/repositories/ai-memory.repository';
import { AiMemoryPolicyService } from './ai-memory-policy.service';
import { AiAgentObservabilityService } from '../observability/ai-agent-observability.service';
import { AiMemoryType } from '../../../generated/prisma/enums';

describe('AiMemoryService', () => {
  let service: AiMemoryService;
  let mockRepository: any;
  let mockPolicyService: any;
  let mockObservability: any;

  beforeEach(async () => {
    mockRepository = {
      upsertForUser: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByKeyForUser: jest.fn(),
      listForUser: jest.fn(),
      countForUser: jest.fn(),
      deleteById: jest.fn(),
      deleteAllForUser: jest.fn(),
    };
    mockPolicyService = {
      MAX_MEMORIES_PER_USER: 20,
      MAX_MEMORY_VALUE_LENGTH: 1000,
      isAllowedType: jest
        .fn()
        .mockImplementation((t) =>
          ['PREFERENCE', 'FINANCIAL_GOAL', 'GENERAL_CONTEXT'].includes(t),
        ),
      isAllowedKey: jest.fn().mockReturnValue(true),
      validate: jest.fn().mockImplementation((type, key, value) => ({
        valid: true,
        sanitizedValue: value,
      })),
    };
    mockObservability = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiMemoryService,
        {
          provide: AiMemoryRepository,
          useValue: mockRepository,
        },
        {
          provide: AiMemoryPolicyService,
          useValue: mockPolicyService,
        },
        {
          provide: AiAgentObservabilityService,
          useValue: mockObservability,
        },
      ],
    }).compile();

    service = module.get<AiMemoryService>(AiMemoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveMemory', () => {
    it('should throw BadRequestException when policy validation fails', async () => {
      mockPolicyService.validate.mockReturnValue({
        valid: false,
        errorCode: 'INVALID_MEMORY_KEY',
        reason: 'Invalid key',
      });

      await expect(
        service.saveMemory('u-1', 'PREFERENCE', 'bad_key', 'val'),
      ).rejects.toThrow(BadRequestException);
      expect(mockObservability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ai.memory.rejected' }),
      );
    });

    it('should throw BadRequestException when memory count reaches max limit', async () => {
      mockRepository.findByKeyForUser.mockResolvedValue(null);
      mockRepository.countForUser.mockResolvedValue(20);

      await expect(
        service.saveMemory('u-1', 'PREFERENCE', 'preferred_currency', 'BRL'),
      ).rejects.toThrow('Memory limit of 20 entries per user reached');
    });

    it('should save memory successfully and emit observability event', async () => {
      mockRepository.findByKeyForUser.mockResolvedValue(null);
      mockRepository.countForUser.mockResolvedValue(1);
      const mockRecord = {
        id: 'm-1',
        userId: 'u-1',
        type: AiMemoryType.PREFERENCE,
        key: 'preferred_currency',
        value: 'BRL',
      };
      mockRepository.upsertForUser.mockResolvedValue(mockRecord);

      const res = await service.saveMemory(
        'u-1',
        'PREFERENCE',
        'preferred_currency',
        'BRL',
      );
      expect(res).toEqual(mockRecord);
      expect(mockObservability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ai.memory.created' }),
      );
    });
  });

  describe('deleteMemory', () => {
    it('should throw NotFoundException if memory to delete is not found', async () => {
      mockRepository.deleteById.mockResolvedValue(false);

      await expect(service.deleteMemory('m-1', 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete memory and emit event when valid', async () => {
      mockRepository.deleteById.mockResolvedValue(true);

      const res = await service.deleteMemory('m-1', 'u-1');
      expect(res).toBe(true);
      expect(mockObservability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'ai.memory.deleted' }),
      );
    });
  });

  describe('formatMemoriesForModelContext', () => {
    it('should format user memories as untrusted XML-tagged context block', () => {
      const memories = [
        {
          id: '1',
          userId: 'u-1',
          type: AiMemoryType.PREFERENCE,
          key: 'preferred_currency',
          value: 'BRL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const formatted = service.formatMemoriesForModelContext(memories);
      expect(formatted).toContain('<user_memory>');
      expect(formatted).toContain('- PREFERENCE / preferred_currency: BRL');
      expect(formatted).toContain('untrusted data');
    });
  });
});
