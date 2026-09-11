import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentOrchestratorService } from './ai-agent-orchestrator.service';
import { OpenAIClient } from '../infrastructure/openai/openai.client';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { FINBUDDY_AGENT_INSTRUCTIONS } from './prompts/finbuddy-agent.instructions';
import { AgentResponse } from '../domain/agent-response';
import { ServiceUnavailableException } from '@nestjs/common';

describe('AiAgentOrchestratorService', () => {
  let service: AiAgentOrchestratorService;
  let mockOpenAiClient: {
    createResponse: jest.Mock;
  };
  let mockToolRegistry: {
    getToolDefinitions: jest.Mock;
  };

  beforeEach(async () => {
    mockOpenAiClient = {
      createResponse: jest.fn(),
    };
    mockToolRegistry = {
      getToolDefinitions: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentOrchestratorService,
        {
          provide: OpenAIClient,
          useValue: mockOpenAiClient,
        },
        {
          provide: AgentToolRegistryService,
          useValue: mockToolRegistry,
        },
      ],
    }).compile();

    service = module.get<AiAgentOrchestratorService>(
      AiAgentOrchestratorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processUserMessage', () => {
    it('should call openAiClient.createResponse with instructions, input, and undefined tools when registry is empty', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([]);
      mockOpenAiClient.createResponse.mockResolvedValue(
        'FinBuddy response text',
      );

      const response = await service.processUserMessage(
        'user-123',
        'Hello FinBuddy',
      );

      expect(mockToolRegistry.getToolDefinitions).toHaveBeenCalled();
      expect(mockOpenAiClient.createResponse).toHaveBeenCalledWith({
        instructions: FINBUDDY_AGENT_INSTRUCTIONS,
        input: 'Hello FinBuddy',
        tools: undefined,
      });
      expect(response).toBeInstanceOf(AgentResponse);
      expect(response.message).toBe('FinBuddy response text');
    });

    it('should include tools in options when registry has tools', async () => {
      const toolDefs = [
        {
          type: 'function',
          name: 'get_balance',
          description: 'Get user balance',
          parameters: {},
        },
      ];
      mockToolRegistry.getToolDefinitions.mockReturnValue(toolDefs);
      mockOpenAiClient.createResponse.mockResolvedValue('Your balance is $100');

      const response = await service.processUserMessage(
        'user-123',
        'What is my balance?',
      );

      expect(mockOpenAiClient.createResponse).toHaveBeenCalledWith({
        instructions: FINBUDDY_AGENT_INSTRUCTIONS,
        input: 'What is my balance?',
        tools: toolDefs,
      });
      expect(response).toEqual(new AgentResponse('Your balance is $100'));
    });

    it('should propagate exceptions thrown by OpenAIClient', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([]);
      mockOpenAiClient.createResponse.mockRejectedValue(
        new ServiceUnavailableException('AI service temporarily unavailable'),
      );

      await expect(
        service.processUserMessage('user-123', 'Help!'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
