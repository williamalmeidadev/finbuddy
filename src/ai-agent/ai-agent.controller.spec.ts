import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AgentResponseDto } from './dto/agent-response.dto';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { AgentResponse } from './domain/agent-response';

describe('AiAgentController', () => {
  let controller: AiAgentController;
  let aiAgentService: {
    sendMessage: jest.Mock;
    confirmAction: jest.Mock;
    cancelAction: jest.Mock;
    createConversation: jest.Mock;
    getConversation: jest.Mock;
    getUserConversations: jest.Mock;
    getConversationMessages: jest.Mock;
    deleteConversation: jest.Mock;
  };

  const mockUser: AuthenticatedUserDto = {
    id: 'user-uuid-1234',
    email: 'test@finbuddy.dev',
  };

  beforeEach(async () => {
    aiAgentService = {
      sendMessage: jest.fn(),
      confirmAction: jest.fn(),
      cancelAction: jest.fn(),
      createConversation: jest.fn(),
      getConversation: jest.fn(),
      getUserConversations: jest.fn(),
      getConversationMessages: jest.fn(),
      deleteConversation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiAgentController],
      providers: [
        {
          provide: AiAgentService,
          useValue: aiAgentService,
        },
      ],
    }).compile();

    controller = module.get<AiAgentController>(AiAgentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should forward user.id and dto.message to AiAgentService and return AgentResponseDto', async () => {
      const dto: SendAgentMessageDto = {
        message: 'How much did I spend this month?',
      };
      const mockAgentResponse = new AgentResponse(
        'You spent $150.00 this month.',
      );
      aiAgentService.sendMessage.mockResolvedValue(mockAgentResponse);

      const result = await controller.sendMessage(mockUser, dto);

      expect(aiAgentService.sendMessage).toHaveBeenCalledWith(
        mockUser.id,
        dto.message,
        { requestId: undefined, aiRequestId: undefined },
      );
      expect(result).toBeInstanceOf(AgentResponseDto);
      expect(result.message).toBe('You spent $150.00 this month.');
    });

    it('should propagate errors thrown by AiAgentService', async () => {
      const dto: SendAgentMessageDto = {
        message: 'Test message',
      };
      aiAgentService.sendMessage.mockRejectedValue(
        new Error('Service unavailable'),
      );

      await expect(
        controller.sendMessage(mockUser, dto, undefined),
      ).rejects.toThrow('Service unavailable');
      expect(aiAgentService.sendMessage).toHaveBeenCalledWith(
        mockUser.id,
        dto.message,
        { requestId: undefined, aiRequestId: undefined },
      );
    });
  });

  describe('confirmAction', () => {
    it('should call aiAgentService.confirmAction with user.id and confirmationId', async () => {
      const confirmationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const mockExecutionResult = {
        success: true,
        message: 'Financial action executed successfully',
        data: { id: 'tx-1' },
      };
      aiAgentService.confirmAction.mockResolvedValue(mockExecutionResult);

      const result = await controller.confirmAction(
        mockUser,
        confirmationId,
        undefined,
      );

      expect(aiAgentService.confirmAction).toHaveBeenCalledWith(
        mockUser.id,
        confirmationId,
        { requestId: undefined, aiRequestId: undefined },
      );
      expect(result).toBe(mockExecutionResult);
    });
  });

  describe('cancelAction', () => {
    it('should call aiAgentService.cancelAction with user.id and confirmationId', async () => {
      const confirmationId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
      const mockCancelResult = {
        success: true,
        message: 'Confirmation request cancelled',
      };
      aiAgentService.cancelAction.mockResolvedValue(mockCancelResult);

      const result = await controller.cancelAction(
        mockUser,
        confirmationId,
        undefined,
      );

      expect(aiAgentService.cancelAction).toHaveBeenCalledWith(
        mockUser.id,
        confirmationId,
        { requestId: undefined, aiRequestId: undefined },
      );
      expect(result).toBe(mockCancelResult);
    });
  });

  describe('conversation endpoints', () => {
    it('should create conversation', async () => {
      const mockConv = { id: 'c-1', userId: mockUser.id, title: 'Budget Plan' };
      aiAgentService.createConversation.mockResolvedValue(mockConv);

      const res = await controller.createConversation(
        mockUser,
        { title: 'Budget Plan' },
        undefined,
      );
      expect(res).toBe(mockConv);
      expect(aiAgentService.createConversation).toHaveBeenCalledWith(
        mockUser.id,
        'Budget Plan',
        { requestId: undefined, aiRequestId: undefined },
      );
    });

    it('should list user conversations', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      aiAgentService.getUserConversations.mockResolvedValue(mockResult);

      const res = await controller.listConversations(mockUser, {
        page: 1,
        limit: 10,
      });
      expect(res).toBe(mockResult);
      expect(aiAgentService.getUserConversations).toHaveBeenCalledWith(
        mockUser.id,
        1,
        10,
      );
    });

    it('should get conversation metadata', async () => {
      const mockConv = { id: 'c-1', userId: mockUser.id };
      aiAgentService.getConversation.mockResolvedValue(mockConv);

      const res = await controller.getConversation(mockUser, 'c-1');
      expect(res).toBe(mockConv);
      expect(aiAgentService.getConversation).toHaveBeenCalledWith(
        'c-1',
        mockUser.id,
      );
    });

    it('should list conversation messages', async () => {
      const mockResult = {
        items: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 1,
      };
      aiAgentService.getConversationMessages.mockResolvedValue(mockResult);

      const res = await controller.listMessages(mockUser, 'c-1', {
        page: 1,
        limit: 20,
      });
      expect(res).toBe(mockResult);
      expect(aiAgentService.getConversationMessages).toHaveBeenCalledWith(
        'c-1',
        mockUser.id,
        1,
        20,
      );
    });

    it('should delete conversation', async () => {
      aiAgentService.deleteConversation.mockResolvedValue(true);

      const res = await controller.deleteConversation(
        mockUser,
        'c-1',
        undefined,
      );
      expect(res).toEqual({
        success: true,
        message: 'Conversation deleted successfully',
      });
      expect(aiAgentService.deleteConversation).toHaveBeenCalledWith(
        'c-1',
        mockUser.id,
        { requestId: undefined, aiRequestId: undefined },
      );
    });
  });
});
