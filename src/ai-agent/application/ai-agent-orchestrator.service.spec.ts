import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentOrchestratorService } from './ai-agent-orchestrator.service';
import { OpenAIClient } from '../infrastructure/openai/openai.client';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from './authorization/agent-tool-authorization.service';
import { AgentToolArgumentValidatorService } from './validation/agent-tool-argument-validator.service';
import { FINBUDDY_AGENT_INSTRUCTIONS } from './prompts/finbuddy-agent.instructions';
import { AgentResponse } from '../domain/agent-response';
import { ServiceUnavailableException } from '@nestjs/common';
import { MetricsService } from '../../common/metrics/metrics.service';
import { AgentCapability } from './authorization/agent-capability.enum';
import { AgentToolRiskLevel } from './tools/agent-tool.interface';

describe('AiAgentOrchestratorService', () => {
  let service: AiAgentOrchestratorService;
  let mockOpenAiClient: {
    createRawResponse: jest.Mock;
  };
  let mockToolRegistry: {
    getToolDefinitions: jest.Mock;
    getTool: jest.Mock;
  };
  let mockMetricsService: {
    increment: jest.Mock;
  };

  beforeEach(async () => {
    mockOpenAiClient = {
      createRawResponse: jest.fn(),
    };
    mockToolRegistry = {
      getToolDefinitions: jest.fn(),
      getTool: jest.fn(),
    };
    mockMetricsService = {
      increment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentOrchestratorService,
        AgentToolAuthorizationService,
        AgentToolArgumentValidatorService,
        {
          provide: OpenAIClient,
          useValue: mockOpenAiClient,
        },
        {
          provide: AgentToolRegistryService,
          useValue: mockToolRegistry,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
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
    it('should return AgentResponse directly when model returns no tool calls', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([]);
      mockOpenAiClient.createRawResponse.mockResolvedValue({
        id: 'resp-1',
        outputText: 'FinBuddy response text',
        functionCalls: [],
      });

      const response = await service.processUserMessage(
        'user-123',
        'Hello FinBuddy',
      );

      expect(mockToolRegistry.getToolDefinitions).toHaveBeenCalled();
      expect(mockOpenAiClient.createRawResponse).toHaveBeenCalledWith({
        instructions: FINBUDDY_AGENT_INSTRUCTIONS,
        input: 'Hello FinBuddy',
        tools: undefined,
        previousResponseId: undefined,
      });
      expect(response).toBeInstanceOf(AgentResponse);
      expect(response.message).toBe('FinBuddy response text');
    });

    it('should execute a tool call and pass output back to model', async () => {
      const toolDefs = [
        {
          type: 'function',
          name: 'get_accounts',
          description: 'Get accounts',
          parameters: {},
        },
      ];
      mockToolRegistry.getToolDefinitions.mockReturnValue(toolDefs);

      const mockTool = {
        name: 'get_accounts',
        capability: AgentCapability.READ_ACCOUNTS,
        riskLevel: AgentToolRiskLevel.LOW,
        readOnly: true,
        execute: jest
          .fn()
          .mockResolvedValue({ success: true, data: [{ id: 'acc-1' }] }),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-1',
          outputText: '',
          functionCalls: [
            { callId: 'call-1', name: 'get_accounts', arguments: {} },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-2',
          outputText: 'Your account balance is R$ 1.000,00',
          functionCalls: [],
        });

      const response = await service.processUserMessage(
        'user-123',
        'What are my accounts?',
      );

      expect(mockTool.execute).toHaveBeenCalledWith(
        { userId: 'user-123' },
        expect.anything(),
      );
      expect(mockOpenAiClient.createRawResponse).toHaveBeenCalledTimes(2);
      expect(mockOpenAiClient.createRawResponse).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          previousResponseId: 'resp-1',
          input: [
            {
              type: 'function_call_output',
              call_id: 'call-1',
              output: JSON.stringify({
                success: true,
                data: [{ id: 'acc-1' }],
              }),
            },
          ],
        }),
      );
      expect(response.message).toBe('Your account balance is R$ 1.000,00');
    });

    it('should handle multiple tool calls in a single turn', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([
        { type: 'function', name: 'get_accounts' },
        { type: 'function', name: 'get_budgets' },
      ]);

      const mockAccountsTool = {
        name: 'get_accounts',
        capability: AgentCapability.READ_ACCOUNTS,
        riskLevel: AgentToolRiskLevel.LOW,
        readOnly: true,
        execute: jest.fn().mockResolvedValue({ success: true, data: [] }),
      };
      const mockBudgetsTool = {
        name: 'get_budgets',
        capability: AgentCapability.READ_BUDGETS,
        riskLevel: AgentToolRiskLevel.LOW,
        readOnly: true,
        execute: jest.fn().mockResolvedValue({ success: true, data: [] }),
      };

      mockToolRegistry.getTool.mockImplementation((name: string) => {
        if (name === 'get_accounts') return mockAccountsTool;
        if (name === 'get_budgets') return mockBudgetsTool;
        return undefined;
      });

      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-1',
          outputText: '',
          functionCalls: [
            { callId: 'call-1', name: 'get_accounts', arguments: {} },
            { callId: 'call-2', name: 'get_budgets', arguments: {} },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-2',
          outputText: 'Accounts and budgets checked.',
          functionCalls: [],
        });

      const response = await service.processUserMessage(
        'user-123',
        'Check accounts and budgets',
      );

      expect(mockAccountsTool.execute).toHaveBeenCalled();
      expect(mockBudgetsTool.execute).toHaveBeenCalled();
      expect(response.message).toBe('Accounts and budgets checked.');
    });

    it('should return safe tool error if requested tool is unknown', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([]);
      mockToolRegistry.getTool.mockReturnValue(undefined);

      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-1',
          outputText: '',
          functionCalls: [
            { callId: 'call-1', name: 'unknown_tool', arguments: {} },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-2',
          outputText: 'Could not access tool',
          functionCalls: [],
        });

      const response = await service.processUserMessage(
        'user-123',
        'Run secret tool',
      );

      expect(mockOpenAiClient.createRawResponse).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          input: [
            {
              type: 'function_call_output',
              call_id: 'call-1',
              output: JSON.stringify({
                success: false,
                error: 'Unknown tool: unknown_tool',
              }),
            },
          ],
        }),
      );
      expect(response.message).toBe('Could not access tool');
    });

    it('should return safe error if argument validation fails', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([]);
      const mockTool = {
        name: 'get_transactions',
        capability: AgentCapability.READ_TRANSACTIONS,
        riskLevel: AgentToolRiskLevel.LOW,
        readOnly: true,
        execute: jest.fn(),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-1',
          outputText: '',
          functionCalls: [
            {
              callId: 'call-1',
              name: 'get_transactions',
              arguments: { accountId: 'not-a-uuid' },
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-2',
          outputText: 'Invalid parameter provided',
          functionCalls: [],
        });

      const response = await service.processUserMessage(
        'user-123',
        'Get transactions for account bad-uuid',
      );

      expect(mockTool.execute).not.toHaveBeenCalled();
      expect(mockOpenAiClient.createRawResponse).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          input: [
            {
              type: 'function_call_output',
              call_id: 'call-1',
              output: expect.stringContaining('Invalid tool arguments'),
            },
          ],
        }),
      );
      expect(response.message).toBe('Invalid parameter provided');
    });

    it('should catch tool execution errors and send error result to model', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([]);
      const failingTool = {
        name: 'get_accounts',
        capability: AgentCapability.READ_ACCOUNTS,
        riskLevel: AgentToolRiskLevel.LOW,
        readOnly: true,
        execute: jest.fn().mockRejectedValue(new Error('Internal exception')),
      };
      mockToolRegistry.getTool.mockReturnValue(failingTool);

      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-1',
          outputText: '',
          functionCalls: [
            { callId: 'call-1', name: 'get_accounts', arguments: {} },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-2',
          outputText: 'Service unavailable for accounts',
          functionCalls: [],
        });

      const response = await service.processUserMessage(
        'user-123',
        'Get my accounts',
      );

      expect(mockOpenAiClient.createRawResponse).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          input: [
            {
              type: 'function_call_output',
              call_id: 'call-1',
              output: JSON.stringify({
                success: false,
                error: 'Failed to execute financial tool',
              }),
            },
          ],
        }),
      );
      expect(response.message).toBe('Service unavailable for accounts');
    });

    it('should throw ServiceUnavailableException if max tool iterations limit is reached', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([]);
      const mockTool = {
        name: 'get_accounts',
        capability: AgentCapability.READ_ACCOUNTS,
        riskLevel: AgentToolRiskLevel.LOW,
        readOnly: true,
        execute: jest.fn().mockResolvedValue({ success: true }),
      };
      mockToolRegistry.getTool.mockReturnValue(mockTool);

      mockOpenAiClient.createRawResponse.mockResolvedValue({
        id: 'resp-infinite',
        outputText: '',
        functionCalls: [
          { callId: 'call-loop', name: 'get_accounts', arguments: {} },
        ],
      });

      await expect(
        service.processUserMessage('user-123', 'Loop forever'),
      ).rejects.toThrow(
        new ServiceUnavailableException(
          'AI agent exceeded maximum allowed tool steps',
        ),
      );

      expect(mockOpenAiClient.createRawResponse).toHaveBeenCalledTimes(5);
    });

    it('should propagate OpenAIClient exceptions', async () => {
      mockToolRegistry.getToolDefinitions.mockReturnValue([]);
      mockOpenAiClient.createRawResponse.mockRejectedValue(
        new ServiceUnavailableException('AI service temporarily unavailable'),
      );

      await expect(
        service.processUserMessage('user-123', 'Help!'),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
