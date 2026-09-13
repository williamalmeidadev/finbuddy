import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiConfirmationService } from './ai-confirmation.service';
import { DatabaseService } from '../../database/database.service';
import { AiConfirmationStatus } from '../../generated/prisma/enums';
import { AiAgentObservabilityService } from './observability/ai-agent-observability.service';

describe('AiConfirmationService', () => {
  let service: AiConfirmationService;
  let mockPrisma: {
    aiConfirmation: {
      create: jest.Mock;
      updateMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
  };
  let mockConfigService: {
    get: jest.Mock;
  };

  let mockObservability: {
    recordEvent: jest.Mock;
  };

  beforeEach(async () => {
    mockPrisma = {
      aiConfirmation: {
        create: jest.fn(),
        updateMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
      },
    };
    mockConfigService = {
      get: jest.fn().mockReturnValue(300),
    };
    mockObservability = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConfirmationService,
        { provide: DatabaseService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AiAgentObservabilityService, useValue: mockObservability },
      ],
    }).compile();

    service = module.get<AiConfirmationService>(AiConfirmationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConfirmation', () => {
    it('should create pending confirmation record in database with TTL', async () => {
      const mockRecord = {
        id: 'conf-uuid-1',
        userId: 'user-1',
        toolName: 'create_transaction',
        argumentsJson: { amount: 100 },
        status: AiConfirmationStatus.PENDING,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        consumedAt: null,
      };
      mockPrisma.aiConfirmation.create.mockResolvedValue(mockRecord);

      const result = await service.createConfirmation(
        'user-1',
        'create_transaction',
        { amount: 100 },
      );

      expect(mockPrisma.aiConfirmation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          toolName: 'create_transaction',
          argumentsJson: { amount: 100 },
          status: AiConfirmationStatus.PENDING,
        }),
      });
      expect(result.id).toBe('conf-uuid-1');
    });
  });

  describe('consumeConfirmation', () => {
    it('should atomically consume pending confirmation when valid', async () => {
      mockPrisma.aiConfirmation.updateMany.mockResolvedValue({ count: 1 });
      const mockRecord = {
        id: 'conf-uuid-1',
        userId: 'user-1',
        toolName: 'create_transaction',
        argumentsJson: { amount: 100 },
        status: AiConfirmationStatus.CONSUMED,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 300000),
        consumedAt: new Date(),
      };
      mockPrisma.aiConfirmation.findUniqueOrThrow.mockResolvedValue(mockRecord);

      const result = await service.consumeConfirmation('conf-uuid-1', 'user-1');

      expect(mockPrisma.aiConfirmation.updateMany).toHaveBeenCalled();
      expect(result.status).toBe(AiConfirmationStatus.CONSUMED);
    });

    it('should throw NotFoundException if confirmation does not exist or user mismatch', async () => {
      mockPrisma.aiConfirmation.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.aiConfirmation.findUnique.mockResolvedValue(null);

      await expect(
        service.consumeConfirmation('conf-unknown', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on replay attempt when already consumed', async () => {
      mockPrisma.aiConfirmation.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.aiConfirmation.findUnique.mockResolvedValue({
        id: 'conf-1',
        userId: 'user-1',
        status: AiConfirmationStatus.CONSUMED,
      });

      await expect(
        service.consumeConfirmation('conf-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on expired confirmation', async () => {
      mockPrisma.aiConfirmation.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.aiConfirmation.findUnique.mockResolvedValue({
        id: 'conf-1',
        userId: 'user-1',
        status: AiConfirmationStatus.PENDING,
        expiresAt: new Date(Date.now() - 10000),
      });

      await expect(
        service.consumeConfirmation('conf-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelConfirmation', () => {
    it('should mark confirmation as cancelled', async () => {
      mockPrisma.aiConfirmation.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.aiConfirmation.findUniqueOrThrow.mockResolvedValue({
        id: 'conf-1',
        userId: 'user-1',
        toolName: 'create_transaction',
        argumentsJson: {},
        status: AiConfirmationStatus.CANCELLED,
        createdAt: new Date(),
        expiresAt: new Date(),
      });

      const result = await service.cancelConfirmation('conf-1', 'user-1');
      expect(result.status).toBe(AiConfirmationStatus.CANCELLED);
    });
  });
});
