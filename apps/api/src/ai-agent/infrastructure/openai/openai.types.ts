export interface CreateResponseOptions {
  input: string | Array<Record<string, unknown>>;
  instructions: string;
  model?: string;
  tools?: Array<Record<string, unknown>>;
  previousResponseId?: string;
}

export interface OpenAIUsageMetadata {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedInputTokens?: number;
  reasoningTokens?: number;
}

export interface OpenAIResponseOutput {
  id: string;
  outputText: string;
  functionCalls: Array<{
    callId: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  usage?: OpenAIUsageMetadata;
  model?: string;
}

export interface OpenAIResponseItem {
  type?: string;
  call_id?: string;
  id?: string;
  name?: string;
  arguments?: unknown;
}

export interface OpenAIRawResponsePayload {
  id?: string;
  model?: string;
  output?: OpenAIResponseItem[];
  output_text?: string;
  usage?: {
    input_tokens?: number;
    prompt_tokens?: number;
    output_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
    input_token_details?: {
      cached_tokens?: number;
    };
    output_token_details?: {
      reasoning_tokens?: number;
    };
  };
}
