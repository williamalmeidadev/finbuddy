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
  };

  const mockUser: AuthenticatedUserDto = {
    id: 'user-uuid-1234',
    email: 'test@finbuddy.dev',
  };

  beforeEach(async () => {
    aiAgentService = {
      sendMessage: jest.fn(),
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

      await expect(controller.sendMessage(mockUser, dto)).rejects.toThrow(
        'Service unavailable',
      );
      expect(aiAgentService.sendMessage).toHaveBeenCalledWith(
        mockUser.id,
        dto.message,
      );
    });
  });
});
