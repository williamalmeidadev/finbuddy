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
  | 'PROD-HARDENING'
  | 'FINANCIAL-ANALYSIS'
  | 'FINANCIAL-WRITE'
  | 'CONFIRMATION-WORKFLOW'
  | 'MULTI-TOOL'
  | 'CONVERSATION-TURN'
  | 'MEMORY-BEHAVIOR'
  | 'TOKEN-ACCOUNTING'
  | 'COST-BUDGET'
  | 'FAILURE-RECOVERY'
  | 'REGRESSION-TEST'
  | (string & {});

export type ScenarioFailureReason =
  | 'TOOL_SELECTION'
  | 'ARGUMENT_VALIDATION'
  | 'AUTHORIZATION'
  | 'CONFIRMATION'
  | 'GROUNDING'
  | 'CONVERSATION'
  | 'MEMORY'
  | 'TIMEOUT'
  | 'MODEL_ERROR'
  | 'TOOL_ERROR'
  | 'ITERATION_LIMIT'
  | 'COST_LIMIT'
  | 'TOKEN_LIMIT'
  | 'LATENCY_LIMIT'
  | 'UNKNOWN';

export interface ScenarioBudgetLimits {
  maxModelCalls?: number;
  maxToolCalls?: number;
  maxTotalTokens?: number;
  maxEstimatedCostUsd?: number;
  maxDurationMs?: number;
}

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
  expectBudgetLimitExceeded?: boolean;
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
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cachedTokens?: number;
    reasoningTokens?: number;
  };
  model?: string;
}

export interface AgentEvaluationScenario {
  id: string;
  category: EvaluationCategory;
  description: string;
  userMessage: string;
  authenticatedUserId: string;
  mockModelResponses?: MockModelCall[];
  budgetLimits?: ScenarioBudgetLimits;
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

export interface EvaluationTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
}

export interface EvaluationResult {
  scenarioId: string;
  category: EvaluationCategory;
  description: string;
  passed: boolean;
  failureReason?: ScenarioFailureReason;
  violations: EvaluationViolation[];
  observedToolCalls: ObservedToolCall[];
  finalResponse?: string;
  iterationCount: number;
  durationMs: number;
  tokenUsage: EvaluationTokenUsage;
  estimatedCostUsd?: number;
  pricingAvailable: boolean;
  modelCallsCount: number;
  toolCallsCount: number;
}

export interface CategorySummary {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
  totalTokens: number;
  totalCostUsd: number;
}

export interface EvaluationReport {
  timestamp: string;
  totalScenarios: number;
  passed: number;
  failed: number;
  passRate: number;
  totalDurationMs: number;
  totalTokens: EvaluationTokenUsage;
  totalEstimatedCostUsd: number;
  allPricingAvailable: boolean;
  results: EvaluationResult[];
  categorySummary: Record<string, CategorySummary>;
}

export interface RepeatedRunMetrics {
  scenarioId: string;
  runsCount: number;
  passCount: number;
  failCount: number;
  passRate: number;
  minDurationMs: number;
  maxDurationMs: number;
  avgDurationMs: number;
  p50DurationMs: number;
  p95DurationMs: number;
  avgTokens: number;
  avgCostUsd: number;
}

export interface RegressionComparisonReport {
  timestamp: string;
  baselinePassRate: number;
  currentPassRate: number;
  passRateDelta: number;
  hasRegression: boolean;
  regressedScenarios: Array<{
    scenarioId: string;
    category: EvaluationCategory;
    description: string;
    baselinePassed: boolean;
    currentPassed: boolean;
    failureReason?: ScenarioFailureReason;
    violations: EvaluationViolation[];
  }>;
  improvedScenarios: Array<{
    scenarioId: string;
    category: EvaluationCategory;
    description: string;
  }>;
  tokenUsageDelta: {
    baselineTotalTokens: number;
    currentTotalTokens: number;
    delta: number;
  };
  costDeltaUsd: {
    baselineTotalCost: number;
    currentTotalCost: number;
    delta: number;
  };
}
