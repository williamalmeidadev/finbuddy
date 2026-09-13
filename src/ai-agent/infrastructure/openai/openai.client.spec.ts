import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { OpenAIClient } from './openai.client';

const mockResponsesCreate = jest.fn();
const mockOpenAIConstructor = jest.fn().mockImplementation(() => ({
  responses: {
    create: mockResponsesCreate,
  },
}));

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest
      .fn()
      .mockImplementation((...args) => mockOpenAIConstructor(...args)),
    OpenAI: jest
      .fn()
      .mockImplementation((...args) => mockOpenAIConstructor(...args)),
  };
});

describe('OpenAIClient', () => {
  let client: OpenAIClient;
  let configService: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'OPENAI_API_KEY') return 'test-key';
              if (key === 'OPENAI_MODEL') return 'gpt-5.5';
              if (key === 'OPENAI_TIMEOUT_MS') return 30000;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<OpenAIClient>(OpenAIClient);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('configuration and initialization', () => {
    it('should throw ServiceUnavailableException if OPENAI_API_KEY is missing', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return undefined;
        return undefined;
      });

      await expect(
        client.createResponse({ input: 'hello', instructions: 'instr' }),
      ).rejects.toThrow(
        new ServiceUnavailableException('AI service is not configured'),
      );
    });

    it('should throw ServiceUnavailableException if OPENAI_API_KEY is whitespace', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return '   ';
        return undefined;
      });

      await expect(
        client.createResponse({ input: 'hello', instructions: 'instr' }),
      ).rejects.toThrow(
        new ServiceUnavailableException('AI service is not configured'),
      );
    });

    it('should initialize OpenAI client with apiKey and timeout from config', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'Test response',
      });

      await client.createResponse({ input: 'hello', instructions: 'instr' });

      expect(mockOpenAIConstructor).toHaveBeenCalledWith({
        apiKey: 'test-key',
        timeout: 30000,
      });
    });

    it('should default timeout to 30000 if OPENAI_TIMEOUT_MS is not configured', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'test-key';
        if (key === 'OPENAI_TIMEOUT_MS') return undefined;
        return undefined;
      });

      mockResponsesCreate.mockResolvedValue({
        output_text: 'Test response',
      });

      await client.createResponse({ input: 'hello', instructions: 'instr' });

      expect(mockOpenAIConstructor).toHaveBeenCalledWith({
        apiKey: 'test-key',
        timeout: 30000,
      });
    });

    it('should reuse existing sdkClient instance across multiple calls', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'Test response',
      });

      await client.createResponse({ input: 'hello 1', instructions: 'instr' });
      await client.createResponse({ input: 'hello 2', instructions: 'instr' });

      expect(mockOpenAIConstructor).toHaveBeenCalledTimes(1);
    });
  });

  describe('createResponse', () => {
    it('should return response output_text on success with default model', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'Financial analysis result',
      });

      const result = await client.createResponse({
        input: 'Analyze spending',
        instructions: 'You are a financial advisor',
      });

      expect(result).toBe('Financial analysis result');
      expect(mockResponsesCreate).toHaveBeenCalledWith({
        model: 'gpt-5.5',
        instructions: 'You are a financial advisor',
        input: 'Analyze spending',
        max_tokens: 1000,
        tools: undefined,
      });
    });

    it('should use custom model if provided in options', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'Custom model response',
      });

      const result = await client.createResponse({
        input: 'Analyze spending',
        instructions: 'You are a financial advisor',
        model: 'gpt-4o-mini',
      });

      expect(result).toBe('Custom model response');
      expect(mockResponsesCreate).toHaveBeenCalledWith({
        model: 'gpt-4o-mini',
        instructions: 'You are a financial advisor',
        input: 'Analyze spending',
        max_tokens: 1000,
        tools: undefined,
      });
    });

    it('should pass tools when tools array is provided and not empty', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'Response with tools',
      });

      const tools = [{ type: 'function', function: { name: 'get_balance' } }];
      const result = await client.createResponse({
        input: 'Check balance',
        instructions: 'Use tools if needed',
        tools,
      });

      expect(result).toBe('Response with tools');
      expect(mockResponsesCreate).toHaveBeenCalledWith({
        model: 'gpt-5.5',
        instructions: 'Use tools if needed',
        input: 'Check balance',
        max_tokens: 1000,
        tools,
      });
    });

    it('should set tools to undefined when empty tools array is provided', async () => {
      mockResponsesCreate.mockResolvedValue({
        output_text: 'Response with empty tools',
      });

      await client.createResponse({
        input: 'Check balance',
        instructions: 'Instructions',
        tools: [],
      });

      expect(mockResponsesCreate).toHaveBeenCalledWith({
        model: 'gpt-5.5',
        instructions: 'Instructions',
        input: 'Check balance',
        max_tokens: 1000,
        tools: undefined,
      });
    });

    it('should throw ServiceUnavailableException if response is null or undefined', async () => {
      mockResponsesCreate.mockResolvedValue(null);

      await expect(
        client.createResponse({ input: 'hello', instructions: 'instr' }),
      ).rejects.toThrow(
        new ServiceUnavailableException('Invalid response from AI provider'),
      );
    });

    it('should throw ServiceUnavailableException if output_text is empty or missing', async () => {
      mockResponsesCreate.mockResolvedValue({ output_text: '' });

      await expect(
        client.createResponse({ input: 'hello', instructions: 'instr' }),
      ).rejects.toThrow(
        new ServiceUnavailableException('Invalid response from AI provider'),
      );
    });

    it('should map OpenAI SDK errors to ServiceUnavailableException', async () => {
      mockResponsesCreate.mockRejectedValue(new Error('Connection timed out'));

      await expect(
        client.createResponse({ input: 'hello', instructions: 'instr' }),
      ).rejects.toThrow(
        new ServiceUnavailableException('AI service temporarily unavailable'),
      );
    });
  });
});
