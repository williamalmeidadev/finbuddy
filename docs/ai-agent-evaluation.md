# FinBuddy AI Agent Evaluation Suite

## 1. Overview

FinBuddy includes a production-grade, deterministic AI Evaluation Harness that measures functional correctness, safety adherence, token accounting, cost estimation, and failure recovery across 465 scenarios.

The evaluation suite runs deterministically without calling external LLM endpoints in standard CI/CD test runs, using a synthetic financial dataset and high-fidelity mock model client. An opt-in real OpenAI runner mode (`RealOpenAIEvaluationRunner`) is available for live model evaluation.

## 2. Key Components

### 2.1 Deterministic Scenario Harness (`scenarios/`)
- **465 Deterministic Scenarios**: Spanning tool selection, argument validation, authorization/IDOR, prompt injection, financial grounding, confirmation workflows, memory management, token accounting, cost budgets, and OpenAI failure recovery.
- **Phase 23 Expansion**: 62 new scenarios (`SCENARIO-404` to `SCENARIO-465`).

### 2.2 Token Accounting & Cost Estimation (`pricing/`)
- Extracts exact usage metadata from the OpenAI Responses API (`input_tokens`, `output_tokens`, `total_tokens`, `cached_tokens`, `reasoning_tokens`).
- **Model Pricing Table (`model-pricing.config.ts`)**:
  - `gpt-4o`: $2.50 / 1M input tokens, $10.00 / 1M output tokens, $1.25 / 1M cached input tokens.
  - `gpt-4o-mini`: $0.15 / 1M input tokens, $0.60 / 1M output tokens, $0.075 / 1M cached input tokens.
  - `gpt-5.5`: $2.50 / 1M input tokens, $10.00 / 1M output tokens, $1.25 / 1M cached input tokens.

### 2.3 Safety Cost & Token Budgets (`ScenarioBudgetLimits`)
- Configurable per-scenario safety limits: `maxModelCalls`, `maxToolCalls`, `maxTotalTokens`, `maxEstimatedCostUsd`, `maxDurationMs`.
- Exceeding a safety limit triggers a `budget_limit_exceeded` violation and classifies the failure reason (`TOKEN_LIMIT`, `COST_LIMIT`, `LATENCY_LIMIT`, `MODEL_ERROR`).

### 2.4 Deterministic Synthetic Dataset (`synthetic-dataset.ts`)
- Complete isolated testing environment with multiple mock users (`usr-synth-primary-001`, `usr-synth-secondary-002`), checking/savings/credit accounts, categories, transactions, budgets, transfers, memories, and multi-turn conversations.

### 2.5 Repeated Runs & Regression Comparison (`evaluation-runner.ts`)
- `runRepeated(scenario, N)`: Runs a scenario N times to calculate latency percentiles (p50, p95), average tokens, average cost, and pass stability.
- `compareRuns(baseline, current)`: Compares two evaluation runs to detect regressions in pass rates, token consumption deltas, cost deltas, and newly failing scenarios.

### 2.6 Opt-in Real OpenAI Runner Mode (`real-openai-runner.ts`)
- Enabled only when `AI_EVALUATION_REAL_OPENAI=true` and `OPENAI_API_KEY` are explicitly provided.
- Runs live requests against OpenAI Responses API with budget safeguards and synthetic user isolation. Never runs in standard CI.

## 3. Running Evaluations

```bash
# Run 465 deterministic AI evaluation scenarios
npm run test:api:eval

# Run scenario unit tests
npm run test:ai:scenario

# Run opt-in real OpenAI evaluation (requires API key)
AI_EVALUATION_REAL_OPENAI=true OPENAI_API_KEY=sk-... npm run test:ai:real
```
