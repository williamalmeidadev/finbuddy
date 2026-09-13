import { AgentEvaluationRunner } from './evaluation-runner';
import { EVALUATION_SCENARIOS } from './scenarios/all-scenarios';
import { EvaluationReport } from './evaluation-types';

describe('AI Agent Evaluation Harness (Deterministic Suite)', () => {
  let runner: AgentEvaluationRunner;
  let report: EvaluationReport;

  beforeAll(async () => {
    runner = new AgentEvaluationRunner();
    report = await runner.runAll(EVALUATION_SCENARIOS);
  });

  it('should run all evaluation scenarios without any failures (100% pass rate)', () => {
    const failedScenarios = report.results
      .filter((r) => !r.passed)
      .map((r) => `[${r.scenarioId}]: ${JSON.stringify(r.violations)}`)
      .join('\n');

    expect(failedScenarios).toBe('');
    expect(report.failed).toBe(0);
    expect(report.passed).toBe(EVALUATION_SCENARIOS.length);
    expect(report.passRate).toBe(100);
  });

  describe('Individual Category Assertions', () => {
    for (const scenario of EVALUATION_SCENARIOS) {
      it(`Scenario ${scenario.id}: ${scenario.description} [${scenario.category}]`, async () => {
        const result = await runner.runScenario(scenario);
        if (!result.passed) {
          throw new Error(
            `Scenario ${scenario.id} violations: ` +
              JSON.stringify(result.violations, null, 2),
          );
        }
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    }
  });

  describe('Registry Write-Tool Safety Assertion', () => {
    it('should confirm unpermitted write tools are rejected and create_transaction requires confirmation', async () => {
      const scenario = EVALUATION_SCENARIOS.find((s) => s.id === 'WT-01');
      expect(scenario).toBeDefined();
      const result = await runner.runScenario(scenario!);
      expect(result.passed).toBe(true);
    });
  });
});
