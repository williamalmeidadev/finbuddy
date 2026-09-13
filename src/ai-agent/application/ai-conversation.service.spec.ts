import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AiConversationService } from './ai-conversation.service';
import { AiConversationRepository } from '../infrastructure/repositories/ai-conversation.repository';
import { AiAgentObservabilityService } from './observability/ai-agent-observability.service';
import { ConversationMessageRole } from '../../generated/prisma/enums';

describe('AiConversationService', () => {
  let service: AiConversationService;
  let mockRepository: any;
  let mockObservability: any;

  beforeEach(async () => {
    mockRepository = {
      createConversation: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserIdPaginated: jest.fn(),
      findMessagesByConversationIdPaginated: jest.fn(),
      getRecentMessages: jest.fn(),
      getNextSequenceNumber: jest.fn(),
      addMessage: jest.fn(),
      deleteConversation: jest.fn(),
    };
    mockObservability = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConversationService,
        {
          provide: AiConversationRepository,
          useValue: mockRepository,
        },
        {
          provide: AiAgentObservabilityService,
          useValue: mockObservability,
        },
      ],
    }).compile();

    service = module.get<AiConversationService>(AiConversationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create conversation and emit observability event', async () => {
      const mockConv = { id: 'c-1', userId: 'u-1', title: 'Financial Budget' };
      mockRepository.createConversation.mockResolvedValue(mockConv);

      const result = await service.createConversation(
        'u-1',
        'Financial Budget',
      );

      expect(result).toEqual(mockConv);
      expect(mockRepository.createConversation).toHaveBeenCalledWith({
        userId: 'u-1',
        title: 'Financial Budget',
      });
      expect(mockObservability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai.conversation.created',
          userId: 'u-1',
        }),
      );
    });
  });

  describe('getConversation', () => {
    it('should return conversation if found and owned by user', async () => {
      const mockConv = { id: 'c-1', userId: 'u-1' };
      mockRepository.findByIdAndUserId.mockResolvedValue(mockConv);

      const result = await service.getConversation('c-1', 'u-1');
      expect(result).toEqual(mockConv);
    });

    it('should throw NotFoundException if not found or IDOR attempt', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.getConversation('c-1', 'other-user'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getUserConversations', () => {
    it('should return paginated conversations with metadata', async () => {
      mockRepository.findByUserIdPaginated.mockResolvedValue({
        items: [{ id: 'c-1' }],
        total: 1,
      });

      const res = await service.getUserConversations('u-1', 1, 10);
      expect(res).toEqual({
        items: [{ id: 'c-1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('getConversationMessages', () => {
    it('should throw NotFoundException if conversation does not exist or user lacks access', async () => {
      mockRepository.findMessagesByConversationIdPaginated.mockResolvedValue(
        null,
      );

      await expect(
        service.getConversationMessages('c-1', 'u-1', 1, 20),
      ).rejects.toThrow(NotFoundException);
    });

    it('should return paginated messages if valid', async () => {
      mockRepository.findMessagesByConversationIdPaginated.mockResolvedValue({
        items: [{ id: 'm-1', content: 'Hello' }],
        total: 1,
      });

      const res = await service.getConversationMessages('c-1', 'u-1', 1, 20);
      expect(res).toEqual({
        items: [{ id: 'm-1', content: 'Hello' }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });
  });

  describe('appendMessage', () => {
    it('should reject invalid role (e.g. SYSTEM or DEVELOPER or TOOL)', async () => {
      await expect(
        service.appendMessage(
          'c-1',
          'u-1',
          'SYSTEM' as any,
          'Malicious instruction',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should append valid USER message and emit observability event', async () => {
      mockRepository.findByIdAndUserId.mockResolvedValue({
        id: 'c-1',
        userId: 'u-1',
      });
      mockRepository.getNextSequenceNumber.mockResolvedValue(1);
      const mockMsg = {
        id: 'm-1',
        conversationId: 'c-1',
        role: ConversationMessageRole.USER,
        content: 'Hi',
        sequenceNumber: 1,
      };
      mockRepository.addMessage.mockResolvedValue(mockMsg);

      const result = await service.appendMessage(
        'c-1',
        'u-1',
        ConversationMessageRole.USER,
        'Hi',
      );

      expect(result).toEqual(mockMsg);
      expect(mockObservability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai.conversation.message.persisted',
        }),
      );
    });
  });

  describe('deleteConversation', () => {
    it('should throw NotFoundException when repository returns false', async () => {
      mockRepository.deleteConversation.mockResolvedValue(false);

      await expect(service.deleteConversation('c-1', 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete conversation and emit event when valid', async () => {
      mockRepository.deleteConversation.mockResolvedValue(true);

      const result = await service.deleteConversation('c-1', 'u-1');
      expect(result).toBe(true);
      expect(mockObservability.recordEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'ai.conversation.deleted',
          meta: { conversationId: 'c-1' },
        }),
      );
    });
  });
});
