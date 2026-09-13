export type EvaluationCategory =
  | 'tool-selection'
  | 'argument-validation'
  | 'authorization'
  | 'idor'
  | 'prompt-injection'
  | 'indirect-injection'
  | 'hallucination'
  | 'tool-failure'
  | 'iteration-limit'
  | 'data-grounding'
  | 'write-tool-safety'
  | 'privacy'
  | 'observability'
  | 'conversation-persistence'
  | 'memory-management'
  | 'ADV-PROMPT-INJECTION'
  | 'ADV-INDIRECT-INJECTION'
  | 'ADV-TOOL-INJECTION'
  | 'ADV-AUTHORIZATION'
  | 'ADV-CONFIRMATION'
  | 'ADV-TOCTOU'
  | 'ADV-FINANCIAL-INVARIANTS'
  | 'ADV-ATOMICITY'
  | 'ADV-CONCURRENCY'
  | 'ADV-MULTI-TOOL'
  | 'ADV-CONVERSATION'
  | 'ADV-MEMORY'
  | 'ADV-PRIVACY'
  | 'ADV-DISCLOSURE'
  | 'ADV-GROUNDING'
  | 'ADV-FAILURE'
  | 'ADV-ITERATION'
  | 'ADV-REGISTRY'
  | 'ADV-RISK'
  | 'ADV-OBSERVABILITY'
  | 'ADV-AUDIT'
  | 'ADV-OPENAI'
  | 'ADV-API'
  | 'PROD-HARDENING';

export interface ExpectedToolCall {
  toolName: string;
  arguments?: Record<string, unknown>;
}

export interface ExpectedBehavior {
  expectedToolCalls?: ExpectedToolCall[];
  forbiddenToolCalls?: string[];
  orderedToolSequence?: boolean;
  expectAuthorized?: boolean;
  expectSuccess?: boolean;
  expectMaxIterationsReached?: boolean;
  expectServiceError?: boolean;
  expectConfirmationRequired?: boolean;
  expectObservabilityEvents?: string[];
  expectAuditPersisted?: boolean;
  expectRedactedKeys?: string[];
  responseMustContain?: string[];
  responseMustNotContain?: string[];
}

export interface MockModelCall {
  functionCalls?: Array<{
    callId: string;
    name: string;
    arguments: Record<string, unknown>;
  }>;
  outputText?: string;
  shouldThrowError?: boolean;
  errorMessage?: string;
}

export interface AgentEvaluationScenario {
  id: string;
  category: EvaluationCategory;
  description: string;
  userMessage: string;
  authenticatedUserId: string;
  mockModelResponses?: MockModelCall[];
  serviceOverrides?: {
    accountsFailure?: boolean;
    transactionsFailure?: boolean;
    summaryFailure?: boolean;
    budgetsFailure?: boolean;
    emptyAccounts?: boolean;
    emptyTransactions?: boolean;
    emptyBudgets?: boolean;
  };
  expectedBehavior: ExpectedBehavior;
  tags: string[];
}

export interface EvaluationViolation {
  type: string;
  message: string;
}

export interface ObservedToolCall {
  toolName: string;
  arguments: Record<string, unknown>;
  callId?: string;
  success?: boolean;
  error?: string;
}

export interface EvaluationResult {
  scenarioId: string;
  category: EvaluationCategory;
  description: string;
  passed: boolean;
  violations: EvaluationViolation[];
  observedToolCalls: ObservedToolCall[];
  finalResponse?: string;
  iterationCount: number;
  durationMs: number;
}

export interface CategorySummary {
  total: number;
  passed: number;
  failed: number;
}

export interface EvaluationReport {
  totalScenarios: number;
  passed: number;
  failed: number;
  passRate: number;
  results: EvaluationResult[];
  categorySummary: Record<string, CategorySummary>;
}
