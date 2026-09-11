export interface CreateResponseOptions {
  input: string | Array<Record<string, unknown>>;
  instructions: string;
  model?: string;
  tools?: Array<Record<string, unknown>>;
  previousResponseId?: string;
}

export interface OpenAIResponseOutput {
  id: string;
  outputText: string;
  functionCalls: Array<{
    callId: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
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
  output?: OpenAIResponseItem[];
  output_text?: string;
}
