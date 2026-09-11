import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { AiAgentService } from './ai-agent.service';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { MetricsService } from '../common/metrics/metrics.service';
import { AgentResponse } from './domain/agent-response';

describe('AiAgentService', () => {
  let service: AiAgentService;
  let mockOrchestrator: {
    processUserMessage: jest.Mock;
  };
  let mockMetricsService: {
    increment: jest.Mock;
  };
  let loggerLogSpy: jest.SpyInstance;

  beforeEach(async () => {
    mockOrchestrator = {
      processUserMessage: jest.fn(),
    };
    mockMetricsService = {
      increment: jest.fn(),
    };

    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        {
          provide: AiAgentOrchestratorService,
          useValue: mockOrchestrator,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
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
    it('should process user message successfully, record metrics and log duration', async () => {
      const mockResponse = new AgentResponse('Financial advice response');
      mockOrchestrator.processUserMessage.mockResolvedValue(mockResponse);

      const result = await service.sendMessage(
        'user-1',
        'How much did I spend?',
      );

      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_agent_requests_total',
      );
      expect(mockOrchestrator.processUserMessage).toHaveBeenCalledWith(
        'user-1',
        'How much did I spend?',
      );
      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_agent_requests_success_total',
      );
      expect(loggerLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[user:user-1\] AI Agent message processed in \d+ms/,
        ),
      );
      expect(result).toBe(mockResponse);
    });

    it('should record failure metric and rethrow error when orchestrator fails', async () => {
      const testError = new Error('Orchestrator failure');
      mockOrchestrator.processUserMessage.mockRejectedValue(testError);

      await expect(
        service.sendMessage('user-1', 'Give me advice'),
      ).rejects.toThrow('Orchestrator failure');

      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_agent_requests_total',
      );
      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_agent_requests_failure_total',
      );
      expect(mockMetricsService.increment).not.toHaveBeenCalledWith(
        'ai_agent_requests_success_total',
      );
    });
  });

  describe('processMessage', () => {
    it('should delegate to sendMessage', async () => {
      const mockResponse = new AgentResponse('Response');
      const sendMessageSpy = jest
        .spyOn(service, 'sendMessage')
        .mockResolvedValue(mockResponse);

      const result = await service.processMessage('user-2', 'Hello');

      expect(sendMessageSpy).toHaveBeenCalledWith('user-2', 'Hello');
      expect(result).toBe(mockResponse);
    });
  });
});
