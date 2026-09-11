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
    if (report.failed > 0) {
      const failedScenarios = report.results
        .filter((r) => !r.passed)
        .map(
          (r) =>
            `[${r.scenarioId}] (${r.category}): ${r.violations.map((v) => v.message).join('; ')}`,
        )
        .join('\n');
      console.error(`Evaluation Suite Failures:\n${failedScenarios}`);
    }

    expect(report.failed).toBe(0);
    expect(report.passed).toBe(EVALUATION_SCENARIOS.length);
    expect(report.passRate).toBe(100);
  });

  describe('Individual Category Assertions', () => {
    for (const scenario of EVALUATION_SCENARIOS) {
      it(`Scenario ${scenario.id}: ${scenario.description} [${scenario.category}]`, async () => {
        const result = await runner.runScenario(scenario);
        if (!result.passed) {
          console.error(
            `Scenario ${scenario.id} failed violations:`,
            result.violations,
          );
        }
        expect(result.passed).toBe(true);
        expect(result.violations).toHaveLength(0);
      });
    }
  });

  describe('Registry Write-Tool Safety Assertion', () => {
    it('should confirm registry contains strictly 4 read tools and ZERO write tools', async () => {
      const scenario = EVALUATION_SCENARIOS.find((s) => s.id === 'WT-01');
      expect(scenario).toBeDefined();
      const result = await runner.runScenario(scenario!);
      expect(result.passed).toBe(true);
    });
  });
});
