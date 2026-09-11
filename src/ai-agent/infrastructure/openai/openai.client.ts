import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  CreateResponseOptions,
  OpenAIResponseItem,
  OpenAIResponseOutput,
  OpenAIRawResponsePayload,
} from './openai.types';

@Injectable()
export class OpenAIClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private sdkClient: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {}

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
    const client = this.getClient();
    const defaultModel =
      this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-5.5';
    const model = options.model || defaultModel;

    try {
      const payload: Record<string, unknown> = {
        model,
        instructions: options.instructions,
        input: options.input,
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

      return {
        id: response.id || '',
        outputText,
        functionCalls,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`OpenAI Responses API call failed: ${message}`, stack);
      throw new ServiceUnavailableException(
        'AI service temporarily unavailable',
      );
    }
  }
}
