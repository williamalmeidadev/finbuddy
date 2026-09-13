import { Test, TestingModule } from '@nestjs/testing';
import { AiConversationRepository } from './ai-conversation.repository';
import { DatabaseService } from '../../../database/database.service';
import { ConversationMessageRole } from '../../../generated/prisma/enums';

describe('AiConversationRepository', () => {
  let repository: AiConversationRepository;
  let mockDatabaseService: any;

  beforeEach(async () => {
    mockDatabaseService = {
      aiConversation: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      aiConversationMessage: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiConversationRepository,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    repository = module.get<AiConversationRepository>(AiConversationRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createConversation', () => {
    it('should create and return a conversation', async () => {
      const mockConv = { id: 'c-1', userId: 'u-1', title: 'Test Title' };
      mockDatabaseService.aiConversation.create.mockResolvedValue(mockConv);

      const res = await repository.createConversation({
        userId: 'u-1',
        title: 'Test Title',
      });

      expect(res).toEqual(mockConv);
      expect(mockDatabaseService.aiConversation.create).toHaveBeenCalledWith({
        data: { userId: 'u-1', title: 'Test Title' },
      });
    });
  });

  describe('findByIdAndUserId', () => {
    it('should find conversation by id and userId', async () => {
      const mockConv = { id: 'c-1', userId: 'u-1' };
      mockDatabaseService.aiConversation.findFirst.mockResolvedValue(mockConv);

      const res = await repository.findByIdAndUserId('c-1', 'u-1');
      expect(res).toEqual(mockConv);
      expect(mockDatabaseService.aiConversation.findFirst).toHaveBeenCalledWith(
        {
          where: { id: 'c-1', userId: 'u-1' },
        },
      );
    });
  });

  describe('findByUserIdPaginated', () => {
    it('should return paginated conversations and total count', async () => {
      const items = [{ id: 'c-1' }];
      mockDatabaseService.aiConversation.findMany.mockResolvedValue(items);
      mockDatabaseService.aiConversation.count.mockResolvedValue(1);

      const res = await repository.findByUserIdPaginated('u-1', 0, 10);
      expect(res).toEqual({ items, total: 1 });
    });
  });

  describe('addMessage', () => {
    it('should add message and update conversation updatedAt via transaction', async () => {
      const mockMsg = {
        id: 'm-1',
        conversationId: 'c-1',
        role: ConversationMessageRole.USER,
        content: 'Hello',
        sequenceNumber: 1,
      };
      mockDatabaseService.aiConversationMessage.create.mockResolvedValue(
        mockMsg,
      );
      mockDatabaseService.aiConversation.update.mockResolvedValue({});

      const res = await repository.addMessage({
        conversationId: 'c-1',
        role: ConversationMessageRole.USER,
        content: 'Hello',
        sequenceNumber: 1,
      });

      expect(res).toEqual(mockMsg);
      expect(mockDatabaseService.$transaction).toHaveBeenCalled();
    });
  });

  describe('deleteConversation', () => {
    it('should return false if conversation does not exist or belong to user', async () => {
      mockDatabaseService.aiConversation.findFirst.mockResolvedValue(null);
      const res = await repository.deleteConversation('c-1', 'u-1');
      expect(res).toBe(false);
    });

    it('should delete conversation and return true when owned by user', async () => {
      mockDatabaseService.aiConversation.findFirst.mockResolvedValue({
        id: 'c-1',
        userId: 'u-1',
      });
      mockDatabaseService.aiConversation.delete.mockResolvedValue({});

      const res = await repository.deleteConversation('c-1', 'u-1');
      expect(res).toBe(true);
      expect(mockDatabaseService.aiConversation.delete).toHaveBeenCalledWith({
        where: { id: 'c-1' },
      });
    });
  });
});
