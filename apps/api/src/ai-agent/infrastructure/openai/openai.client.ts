import {
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { MetricsService } from '../../../common/metrics/metrics.service';
import {
  CreateResponseOptions,
  OpenAIResponseItem,
  OpenAIResponseOutput,
  OpenAIRawResponsePayload,
} from './openai.types';

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

@Injectable()
export class OpenAIClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private sdkClient: OpenAI | null = null;
  private circuitState: CircuitBreakerState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly metricsService?: MetricsService,
  ) {}

  getCircuitState(): CircuitBreakerState {
    return this.circuitState;
  }

  resetCircuitBreaker(): void {
    this.circuitState = 'CLOSED';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }

  private getClient(): OpenAI {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey || apiKey.trim() === '') {
      throw new ServiceUnavailableException('AI service is not configured');
    }

    if (!this.sdkClient) {
      const timeout =
        this.configService.get<number>('OPENAI_TIMEOUT_MS') ?? 30000;
      this.sdkClient = new OpenAI({
        apiKey,
        timeout,
      });
    }

    return this.sdkClient;
  }

  async createResponse(options: CreateResponseOptions): Promise<string> {
    const raw = await this.createRawResponse(options);
    return raw.outputText;
  }

  async createRawResponse(
    options: CreateResponseOptions,
  ): Promise<OpenAIResponseOutput> {
    const failureThreshold =
      this.configService.get<number>('AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD') ??
      5;
    const resetTimeoutMs =
      this.configService.get<number>('AI_CIRCUIT_BREAKER_RESET_TIMEOUT_MS') ??
      30000;

    if (this.circuitState === 'OPEN') {
      if (Date.now() - this.lastFailureTime > resetTimeoutMs) {
        this.circuitState = 'HALF_OPEN';
        this.logger.log('Circuit breaker transitioning from OPEN to HALF_OPEN');
      } else {
        this.metricsService?.increment('ai_circuit_breaker_open_total');
        this.metricsService?.increment('ai_requests_failed_total');
        throw new ServiceUnavailableException(
          'AI service temporarily unavailable (circuit breaker open)',
        );
      }
    }

    const client = this.getClient();
    const defaultModel =
      this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-5.5';
    const model = options.model || defaultModel;
    const maxTokens =
      this.configService.get<number>('OPENAI_MAX_OUTPUT_TOKENS') ?? 1000;

    try {
      const payload: Record<string, unknown> = {
        model,
        instructions: options.instructions,
        input: options.input,
        max_tokens: maxTokens,
        tools:
          options.tools && options.tools.length > 0 ? options.tools : undefined,
      };

      if (options.previousResponseId) {
        payload.previous_response_id = options.previousResponseId;
      }

      const responsesApi = client.responses as unknown as {
        create: (
          p: Record<string, unknown>,
        ) => Promise<OpenAIRawResponsePayload>;
      };
      const response: OpenAIRawResponsePayload =
        await responsesApi.create(payload);

      const functionCalls: Array<{
        callId: string;
        name: string;
        arguments: Record<string, unknown>;
      }> = [];

      if (response && Array.isArray(response.output)) {
        const outputItems: OpenAIResponseItem[] = response.output;
        for (const item of outputItems) {
          if (item && item.type === 'function_call') {
            let parsedArgs: Record<string, unknown> = {};
            if (typeof item.arguments === 'string') {
              try {
                parsedArgs = JSON.parse(item.arguments) as Record<
                  string,
                  unknown
                >;
              } catch {
                parsedArgs = { raw: item.arguments };
              }
            } else if (item.arguments && typeof item.arguments === 'object') {
              parsedArgs = item.arguments as Record<string, unknown>;
            }

            functionCalls.push({
              callId: item.call_id || item.id || '',
              name: item.name || '',
              arguments: parsedArgs,
            });
          }
        }
      }

      const outputText = response?.output_text || '';
      const hasOutputText = outputText.trim().length > 0;
      const hasFunctionCalls = functionCalls.length > 0;

      if (!response || (!hasOutputText && !hasFunctionCalls)) {
        throw new ServiceUnavailableException(
          'Invalid response from AI provider',
        );
      }

      // Success recovery
      if (this.circuitState !== 'CLOSED') {
        this.logger.log(
          'Circuit breaker reset to CLOSED after successful OpenAI response',
        );
      }
      this.circuitState = 'CLOSED';
      this.failureCount = 0;
      this.metricsService?.increment('ai_llm_calls_total');

      const usageRaw = response?.usage;
      const inputTokens = usageRaw?.input_tokens ?? usageRaw?.prompt_tokens;
      const outputTokens =
        usageRaw?.output_tokens ?? usageRaw?.completion_tokens;
      const totalTokens =
        usageRaw?.total_tokens ??
        (inputTokens !== undefined && outputTokens !== undefined
          ? inputTokens + outputTokens
          : undefined);

      const usage = usageRaw
        ? {
            inputTokens,
            outputTokens,
            totalTokens,
            cachedInputTokens: usageRaw.input_token_details?.cached_tokens,
            reasoningTokens: usageRaw.output_token_details?.reasoning_tokens,
          }
        : undefined;

      return {
        id: response.id || '',
        outputText,
        functionCalls,
        usage,
        model: response.model || model,
      };
    } catch (error) {
      this.failureCount++;
      this.metricsService?.increment('ai_llm_failures_total');

      if (this.failureCount >= failureThreshold) {
        this.circuitState = 'OPEN';
        this.lastFailureTime = Date.now();
        this.metricsService?.increment('ai_circuit_breaker_open_total');
        this.logger.warn(
          `Circuit breaker opened after ${this.failureCount} consecutive failures`,
        );
      }

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const safeMessage = message
        .replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***')
        .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ***')
        .replace(/postgres(ql)?:\/\/[^\s]+/gi, 'postgresql://***');
      const stack = error instanceof Error ? error.stack : undefined;
      const safeStack = stack
        ? stack
            .replace(/sk-[a-zA-Z0-9_-]+/g, 'sk-***')
            .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ***')
            .replace(/postgres(ql)?:\/\/[^\s]+/gi, 'postgresql://***')
        : undefined;

      this.logger.error(
        `OpenAI Responses API call failed: ${safeMessage}`,
        safeStack,
      );
      throw new ServiceUnavailableException(
        'AI service temporarily unavailable',
      );
    }
  }
}
