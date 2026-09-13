import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentService } from './ai-agent.service';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { AiConfirmationService } from './application/ai-confirmation.service';
import { AgentToolRegistryService } from './application/tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from './application/authorization/agent-tool-authorization.service';
import { MetricsService } from '../common/metrics/metrics.service';
import { AiAgentObservabilityService } from './application/observability/ai-agent-observability.service';
import { AgentResponse } from './domain/agent-response';

import { AiConversationService } from './application/ai-conversation.service';
import { AiMemoryService } from './application/memory/ai-memory.service';
import { ConfigService } from '@nestjs/config';

describe('AiAgentService', () => {
  let service: AiAgentService;
  let mockOrchestrator: {
    processUserMessage: jest.Mock;
  };
  let mockConfirmationService: {
    consumeConfirmation: jest.Mock;
    cancelConfirmation: jest.Mock;
  };
  let mockToolRegistry: {
    getTool: jest.Mock;
  };
  let mockAuthorizationService: {
    authorize: jest.Mock;
  };
  let mockMetricsService: {
    increment: jest.Mock;
  };
  let mockObservability: {
    recordEvent: jest.Mock;
  };
  let mockConversationService: {
    createConversation: jest.Mock;
    getConversation: jest.Mock;
    getUserConversations: jest.Mock;
    getConversationMessages: jest.Mock;
    getRecentHistory: jest.Mock;
    appendMessage: jest.Mock;
    deleteConversation: jest.Mock;
  };
  let mockMemoryService: {
    getUserMemories: jest.Mock;
    formatMemoriesForModelContext: jest.Mock;
    saveMemory: jest.Mock;
    getMemoryById: jest.Mock;
    updateMemoryValue: jest.Mock;
    deleteMemory: jest.Mock;
    deleteAllMemoriesForUser: jest.Mock;
  };

  beforeEach(async () => {
    mockOrchestrator = {
      processUserMessage: jest.fn(),
    };
    mockConfirmationService = {
      consumeConfirmation: jest.fn(),
      cancelConfirmation: jest.fn(),
    };
    mockToolRegistry = {
      getTool: jest.fn(),
    };
    mockAuthorizationService = {
      authorize: jest.fn(),
    };
    mockMetricsService = {
      increment: jest.fn(),
    };
    mockObservability = {
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };
    mockConversationService = {
      createConversation: jest
        .fn()
        .mockResolvedValue({ id: 'c-1', userId: 'user-1' }),
      getConversation: jest
        .fn()
        .mockResolvedValue({ id: 'c-1', userId: 'user-1' }),
      getUserConversations: jest.fn(),
      getConversationMessages: jest.fn(),
      getRecentHistory: jest.fn().mockResolvedValue([]),
      appendMessage: jest.fn().mockResolvedValue({ id: 'm-1' }),
      deleteConversation: jest.fn(),
    };
    mockMemoryService = {
      getUserMemories: jest.fn().mockResolvedValue([]),
      formatMemoriesForModelContext: jest.fn().mockReturnValue(null),
      saveMemory: jest.fn(),
      getMemoryById: jest.fn(),
      updateMemoryValue: jest.fn(),
      deleteMemory: jest.fn(),
      deleteAllMemoriesForUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        {
          provide: AiAgentOrchestratorService,
          useValue: mockOrchestrator,
        },
        {
          provide: AiConfirmationService,
          useValue: mockConfirmationService,
        },
        {
          provide: AgentToolRegistryService,
          useValue: mockToolRegistry,
        },
        {
          provide: AgentToolAuthorizationService,
          useValue: mockAuthorizationService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
        {
          provide: AiAgentObservabilityService,
          useValue: mockObservability,
        },
        {
          provide: AiConversationService,
          useValue: mockConversationService,
        },
        {
          provide: AiMemoryService,
          useValue: mockMemoryService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'AI_MAX_INPUT_CHARS') return 2000;
              if (key === 'AI_MAX_CONTEXT_CHARS') return 15000;
              if (key === 'AI_MAX_MEMORY_CONTEXT_CHARS') return 2000;
              if (key === 'AI_MAX_CONCURRENT_REQUESTS_PER_USER') return 3;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AiAgentService>(AiAgentService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    it('should process user message successfully', async () => {
      const mockResponse = new AgentResponse('Financial advice response');
      mockOrchestrator.processUserMessage.mockResolvedValue(mockResponse);

      const result = await service.sendMessage(
        'user-1',
        'How much did I spend?',
        { requestId: 'req-1', aiRequestId: 'ai-req-1' },
      );

      expect(mockOrchestrator.processUserMessage).toHaveBeenCalledWith(
        'user-1',
        'How much did I spend?',
        { requestId: 'req-1', aiRequestId: 'ai-req-1', history: [] },
      );
      expect(result.message).toBe('Financial advice response');
      expect(result.conversationId).toBe('c-1');
    });

    it('should rethrow error when orchestrator fails', async () => {
      const testError = new Error('Orchestrator failure');
      mockOrchestrator.processUserMessage.mockRejectedValue(testError);

      await expect(
        service.sendMessage('user-1', 'Give me advice'),
      ).rejects.toThrow('Orchestrator failure');
    });
  });

  describe('confirmAction', () => {
    it('should consume confirmation, verify tool authorization and execute tool directly', async () => {
      const mockTool = {
        name: 'create_transaction',
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, data: { id: 'tx-1' } }),
      };
      mockConfirmationService.consumeConfirmation.mockResolvedValue({
        id: 'conf-1',
        userId: 'user-1',
        toolName: 'create_transaction',
        argumentsJson: { amount: 50 },
        aiRequestId: 'ai-req-1',
      });
      mockToolRegistry.getTool.mockReturnValue(mockTool);
      mockAuthorizationService.authorize.mockReturnValue({ authorized: true });

      const result = await service.confirmAction('user-1', 'conf-1', {
        requestId: 'req-1',
      });

      expect(mockConfirmationService.consumeConfirmation).toHaveBeenCalledWith(
        'conf-1',
        'user-1',
        { requestId: 'req-1' },
      );
      expect(mockToolRegistry.getTool).toHaveBeenCalledWith(
        'create_transaction',
      );
      expect(mockAuthorizationService.authorize).toHaveBeenCalledWith(
        'user-1',
        mockTool,
      );
      expect(mockTool.execute).toHaveBeenCalledWith(
        { userId: 'user-1', requestId: 'req-1', aiRequestId: 'ai-req-1' },
        { amount: 50 },
      );
      expect(result).toEqual({
        success: true,
        message: 'Financial action executed successfully',
        data: { id: 'tx-1' },
      });
    });
  });

  describe('cancelAction', () => {
    it('should delegate cancellation to confirmation service', async () => {
      mockConfirmationService.cancelConfirmation.mockResolvedValue({
        id: 'conf-1',
        status: 'CANCELLED',
      });

      const result = await service.cancelAction('user-1', 'conf-1', {
        requestId: 'req-1',
      });

      expect(mockConfirmationService.cancelConfirmation).toHaveBeenCalledWith(
        'conf-1',
        'user-1',
        { requestId: 'req-1' },
      );
      expect(result).toEqual({
        success: true,
        message: 'Confirmation request cancelled',
      });
    });
  });
});
