import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CreateResponseOptions } from './openai.types';

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
    const client = this.getClient();
    const defaultModel =
      this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-5.5';
    const model = options.model || defaultModel;

    try {
      const response = await client.responses.create({
        model,
        instructions: options.instructions,
        input: options.input,
        tools:
          options.tools && options.tools.length > 0 ? options.tools : undefined,
      });

      if (!response || !response.output_text) {
        throw new ServiceUnavailableException(
          'Invalid response from AI provider',
        );
      }

      return response.output_text;
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
