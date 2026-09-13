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
    expect(EVALUATION_SCENARIOS.length).toBeGreaterThanOrEqual(400);
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

    it('should verify all registered tools in AgentToolRegistry have complete risk, capability, and schema metadata', async () => {
      const { Test } = await import('@nestjs/testing');
      const { AgentToolRegistryService } =
        await import('../../../src/ai-agent/application/tools/agent-tool-registry.service');
      const { GetAccountsTool } =
        await import('../../../src/ai-agent/application/tools/impl/get-accounts.tool');
      const { GetTransactionsTool } =
        await import('../../../src/ai-agent/application/tools/impl/get-transactions.tool');
      const { GetFinancialSummaryTool } =
        await import('../../../src/ai-agent/application/tools/impl/get-financial-summary.tool');
      const { GetBudgetsTool } =
        await import('../../../src/ai-agent/application/tools/impl/get-budgets.tool');
      const { CreateTransactionTool } =
        await import('../../../src/ai-agent/application/tools/impl/create-transaction.tool');
      const { SaveMemoryTool } =
        await import('../../../src/ai-agent/application/tools/impl/save-memory.tool');
      const { UpdateTransactionTool } =
        await import('../../../src/ai-agent/application/tools/impl/update-transaction.tool');
      const { DeleteTransactionTool } =
        await import('../../../src/ai-agent/application/tools/impl/delete-transaction.tool');
      const { CreateTransferTool } =
        await import('../../../src/ai-agent/application/tools/impl/create-transfer.tool');
      const { UpdateTransferTool } =
        await import('../../../src/ai-agent/application/tools/impl/update-transfer.tool');
      const { DeleteTransferTool } =
        await import('../../../src/ai-agent/application/tools/impl/delete-transfer.tool');

      const moduleRef = await Test.createTestingModule({
        providers: [
          AgentToolRegistryService,
          {
            provide: GetAccountsTool,
            useValue: {
              name: 'get_accounts',
              description: 'desc',
              inputSchema: {},
              capability: 'read',
              riskLevel: 'LOW',
              readOnly: true,
            },
          },
          {
            provide: GetTransactionsTool,
            useValue: {
              name: 'get_transactions',
              description: 'desc',
              inputSchema: {},
              capability: 'read',
              riskLevel: 'LOW',
              readOnly: true,
            },
          },
          {
            provide: GetFinancialSummaryTool,
            useValue: {
              name: 'get_financial_summary',
              description: 'desc',
              inputSchema: {},
              capability: 'read',
              riskLevel: 'LOW',
              readOnly: true,
            },
          },
          {
            provide: GetBudgetsTool,
            useValue: {
              name: 'get_budgets',
              description: 'desc',
              inputSchema: {},
              capability: 'read',
              riskLevel: 'LOW',
              readOnly: true,
            },
          },
          {
            provide: CreateTransactionTool,
            useValue: {
              name: 'create_transaction',
              description: 'desc',
              inputSchema: {},
              capability: 'write',
              riskLevel: 'MEDIUM',
              readOnly: false,
              requiresConfirmation: true,
            },
          },
          {
            provide: SaveMemoryTool,
            useValue: {
              name: 'save_memory',
              description: 'desc',
              inputSchema: {},
              capability: 'memory',
              riskLevel: 'LOW',
              readOnly: false,
            },
          },
          {
            provide: UpdateTransactionTool,
            useValue: {
              name: 'update_transaction',
              description: 'desc',
              inputSchema: {},
              capability: 'write',
              riskLevel: 'MEDIUM',
              readOnly: false,
              requiresConfirmation: true,
            },
          },
          {
            provide: DeleteTransactionTool,
            useValue: {
              name: 'delete_transaction',
              description: 'desc',
              inputSchema: {},
              capability: 'write',
              riskLevel: 'MEDIUM',
              readOnly: false,
              requiresConfirmation: true,
            },
          },
          {
            provide: CreateTransferTool,
            useValue: {
              name: 'create_transfer',
              description: 'desc',
              inputSchema: {},
              capability: 'transfer',
              riskLevel: 'HIGH',
              readOnly: false,
              requiresConfirmation: true,
            },
          },
          {
            provide: UpdateTransferTool,
            useValue: {
              name: 'update_transfer',
              description: 'desc',
              inputSchema: {},
              capability: 'transfer',
              riskLevel: 'HIGH',
              readOnly: false,
              requiresConfirmation: true,
            },
          },
          {
            provide: DeleteTransferTool,
            useValue: {
              name: 'delete_transfer',
              description: 'desc',
              inputSchema: {},
              capability: 'transfer',
              riskLevel: 'HIGH',
              readOnly: false,
              requiresConfirmation: true,
            },
          },
        ],
      }).compile();

      const registry = moduleRef.get(
        AgentToolRegistryService,
      );
      registry.onModuleInit();
      const tools = registry.getTools();

      expect(tools.length).toBe(11);
      for (const tool of tools) {
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
        expect(tool.capability).toBeDefined();
        expect(tool.riskLevel).toBeDefined();
        expect(typeof tool.readOnly).toBe('boolean');
      }
    });
  });
});
