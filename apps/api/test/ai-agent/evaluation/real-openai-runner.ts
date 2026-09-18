import {
  AgentEvaluationScenario,
  EvaluationReport,
  EvaluationResult,
} from './evaluation-types';
import { calculateModelCost } from '../../src/ai-agent/application/evaluation/pricing/model-pricing.config';

export class RealOpenAIEvaluationRunner {
  private isEnabled(): boolean {
    return (
      process.env.AI_EVALUATION_REAL_OPENAI === 'true' &&
      !!process.env.OPENAI_API_KEY
    );
  }

  async runScenarioReal(
    scenario: AgentEvaluationScenario,
  ): Promise<EvaluationResult | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const { OpenAIClient } =
      await import('../../src/ai-agent/infrastructure/openai/openai.client');
    const { ConfigService } = await import('@nestjs/config');

    const configService = new ConfigService({
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    });

    const client = new OpenAIClient(configService);
    const startTime = Date.now();

    try {
      const response = await client.createRawResponse({
        instructions:
          'You are FinBuddy, a helpful personal finance AI assistant.',
        input: scenario.userMessage,
      });

      const durationMs = Date.now() - startTime;
      const inputTokens = response.usage?.inputTokens ?? 0;
      const outputTokens = response.usage?.outputTokens ?? 0;
      const totalTokens =
        response.usage?.totalTokens ?? inputTokens + outputTokens;
      const cachedTokens = response.usage?.cachedTokens ?? 0;
      const reasoningTokens = response.usage?.reasoningTokens ?? 0;

      const costCalc = calculateModelCost(response.model ?? 'gpt-4o-mini', {
        inputTokens,
        outputTokens,
        cachedInputTokens: cachedTokens,
      });

      return {
        scenarioId: scenario.id,
        category: scenario.category,
        description: scenario.description,
        passed: true,
        violations: [],
        observedToolCalls: response.functionCalls.map((fc) => ({
          toolName: fc.name,
          arguments: fc.arguments ?? {},
          callId: fc.callId,
        })),
        finalResponse: response.outputText,
        iterationCount: 1,
        durationMs,
        tokenUsage: {
          inputTokens,
          outputTokens,
          totalTokens,
          cachedTokens,
          reasoningTokens,
        },
        estimatedCostUsd: costCalc.estimatedTotalCost ?? 0,
        pricingAvailable: costCalc.pricingAvailable,
        modelCallsCount: 1,
        toolCallsCount: response.functionCalls.length,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      return {
        scenarioId: scenario.id,
        category: scenario.category,
        description: scenario.description,
        passed: false,
        failureReason: 'MODEL_ERROR',
        violations: [
          {
            type: 'real_openai_error',
            message: err instanceof Error ? err.message : String(err),
          },
        ],
        observedToolCalls: [],
        finalResponse: undefined,
        iterationCount: 1,
        durationMs,
        tokenUsage: {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cachedTokens: 0,
          reasoningTokens: 0,
        },
        estimatedCostUsd: 0,
        pricingAvailable: false,
        modelCallsCount: 1,
        toolCallsCount: 0,
      };
    }
  }

  async runAllReal(
    scenarios: AgentEvaluationScenario[],
  ): Promise<EvaluationReport | null> {
    if (!this.isEnabled()) {
      return null;
    }

    const results: EvaluationResult[] = [];
    for (const scenario of scenarios) {
      const res = await this.runScenarioReal(scenario);
      if (res) results.push(res);
    }

    const totalScenarios = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = totalScenarios - passed;
    const passRate = totalScenarios > 0 ? (passed / totalScenarios) * 100 : 100;

    let totalTokensAll = 0;
    let totalCostAll = 0;
    for (const r of results) {
      totalTokensAll += r.tokenUsage.totalTokens;
      totalCostAll += r.estimatedCostUsd ?? 0;
    }

    return {
      timestamp: new Date().toISOString(),
      totalScenarios,
      passed,
      failed,
      passRate: parseFloat(passRate.toFixed(2)),
      totalDurationMs: results.reduce((acc, r) => acc + r.durationMs, 0),
      totalTokens: {
        inputTokens: results.reduce(
          (acc, r) => acc + r.tokenUsage.inputTokens,
          0,
        ),
        outputTokens: results.reduce(
          (acc, r) => acc + r.tokenUsage.outputTokens,
          0,
        ),
        totalTokens: totalTokensAll,
        cachedTokens: results.reduce(
          (acc, r) => acc + r.tokenUsage.cachedTokens,
          0,
        ),
        reasoningTokens: results.reduce(
          (acc, r) => acc + r.tokenUsage.reasoningTokens,
          0,
        ),
      },
      totalEstimatedCostUsd: parseFloat(totalCostAll.toFixed(6)),
      allPricingAvailable: results.every((r) => r.pricingAvailable),
      results,
      categorySummary: {},
    };
  }
}
