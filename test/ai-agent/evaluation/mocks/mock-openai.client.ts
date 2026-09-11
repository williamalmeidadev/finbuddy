import { Injectable } from '@nestjs/common';
import { OpenAIClient } from '../../../../src/ai-agent/infrastructure/openai/openai.client';
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
  }): Promise<{
    id: string;
    outputText: string;
    functionCalls: Array<{
      callId: string;
      name: string;
      arguments: Record<string, any>;
    }>;
  }> {
    await Promise.resolve();
    if (this.responseQueue.length > 0) {
      const nextCall = this.responseQueue.shift()!;
      return {
        id: `mock-resp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        outputText: nextCall.outputText ?? '',
        functionCalls: (nextCall.functionCalls ?? []).map((fc) => ({
          callId:
            fc.callId ?? `call-${Math.random().toString(36).substring(7)}`,
          name: fc.name,
          arguments: fc.arguments ?? {},
        })),
      };
    }

    return {
      id: `mock-resp-default`,
      outputText: 'Mock model response text',
      functionCalls: [],
    };
  }
}
