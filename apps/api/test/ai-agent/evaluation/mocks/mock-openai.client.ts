import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { OpenAIClient } from '../../../../src/ai-agent/infrastructure/openai/openai.client';
import { OpenAIResponseOutput } from '../../../../src/ai-agent/infrastructure/openai/openai.types';
import { MockModelCall } from '../evaluation-types';

@Injectable()
export class MockOpenAIClientEvaluation extends OpenAIClient {
  private responseQueue: MockModelCall[] = [];

  setResponseQueue(queue: MockModelCall[]): void {
    this.responseQueue = [...queue];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  override async createRawResponse(_params: {
    instructions: string;
    input: string | any[];
    tools?: any[];
    previousResponseId?: string;
  }): Promise<OpenAIResponseOutput> {
    await Promise.resolve();
    if (this.responseQueue.length > 0) {
      const nextCall = this.responseQueue.shift()!;
      if (nextCall.shouldThrowError) {
        throw new ServiceUnavailableException(
          nextCall.errorMessage ?? 'AI service temporarily unavailable',
        );
      }

      const defaultInputTokens = 120;
      const defaultOutputTokens = 40;
      const usage = nextCall.usage ?? {
        inputTokens: defaultInputTokens,
        outputTokens: defaultOutputTokens,
        totalTokens: defaultInputTokens + defaultOutputTokens,
      };

      return {
        id: `mock-resp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        outputText: nextCall.outputText ?? '',
        functionCalls: (nextCall.functionCalls ?? []).map((fc) => ({
          callId:
            fc.callId ?? `call-${Math.random().toString(36).substring(7)}`,
          name: fc.name,
          arguments: fc.arguments ?? {},
        })),
        usage,
        model: nextCall.model ?? 'gpt-5.5',
      };
    }

    return {
      id: `mock-resp-default`,
      outputText: 'Mock model response text',
      functionCalls: [],
      usage: {
        inputTokens: 100,
        outputTokens: 20,
        totalTokens: 120,
      },
      model: 'gpt-5.5',
    };
  }
}
