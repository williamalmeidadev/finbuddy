import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiAgentOrchestratorService } from '../../../src/ai-agent/application/ai-agent-orchestrator.service';
import { AgentToolRegistryService } from '../../../src/ai-agent/application/tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from '../../../src/ai-agent/application/authorization/agent-tool-authorization.service';
import { AgentToolArgumentValidatorService } from '../../../src/ai-agent/application/validation/agent-tool-argument-validator.service';
import { AiConfirmationService } from '../../../src/ai-agent/application/ai-confirmation.service';
import { OpenAIClient } from '../../../src/ai-agent/infrastructure/openai/openai.client';
import { MetricsService } from '../../../src/common/metrics/metrics.service';
import { AccountService } from '../../../src/account/account.service';
import { TransactionService } from '../../../src/transaction/transaction.service';
import { FinancialSummaryService } from '../../../src/financial-summary/financial-summary.service';
import { BudgetService } from '../../../src/budget/budget.service';
import { DatabaseService } from '../../../src/database/database.service';
import { AiAgentObservabilityService } from '../../../src/ai-agent/application/observability/ai-agent-observability.service';
import { GetAccountsTool } from '../../../src/ai-agent/application/tools/impl/get-accounts.tool';
import { GetTransactionsTool } from '../../../src/ai-agent/application/tools/impl/get-transactions.tool';
import { GetFinancialSummaryTool } from '../../../src/ai-agent/application/tools/impl/get-financial-summary.tool';
import { GetBudgetsTool } from '../../../src/ai-agent/application/tools/impl/get-budgets.tool';
import { CreateTransactionTool } from '../../../src/ai-agent/application/tools/impl/create-transaction.tool';
import { AgentResponse } from '../../../src/ai-agent/domain/agent-response';
import { AiAgentService } from '../../../src/ai-agent/ai-agent.service';
import { AiConversationService } from '../../../src/ai-agent/application/ai-conversation.service';
import { AiConversationRepository } from '../../../src/ai-agent/infrastructure/repositories/ai-conversation.repository';

import {
  AgentEvaluationScenario,
  CategorySummary,
  EvaluationReport,
  EvaluationResult,
  EvaluationViolation,
  ObservedToolCall,
} from './evaluation-types';
import { MockOpenAIClientEvaluation } from './mocks/mock-openai.client';
import {
  EVAL_ACCOUNTS,
  EVAL_BUDGETS,
  EVAL_SUMMARIES,
  EVAL_TRANSACTIONS,
  EVAL_USERS,
} from './fixtures';

export class AgentEvaluationRunner {
  async runScenario(
    scenario: AgentEvaluationScenario,
  ): Promise<EvaluationResult> {
    const startTime = Date.now();
    const observedModelCalls: ObservedToolCall[] = [];
    const executedToolCalls: ObservedToolCall[] = [];
    const violations: EvaluationViolation[] = [];
    const confirmationsMap = new Map<string, any>();
    const auditsList: any[] = [];

    // Mocks for domain financial services
    const mockAccountService = {
      findByUserId: jest.fn().mockImplementation(async (userId: string) => {
        await Promise.resolve();
        if (scenario.serviceOverrides?.accountsFailure) {
          throw new Error('Account service database exception');
        }
        if (scenario.serviceOverrides?.emptyAccounts) {
          return [];
        }
        if (userId === EVAL_USERS.USER_A) {
          return [EVAL_ACCOUNTS.ACCOUNT_A1];
        }
        if (userId === EVAL_USERS.USER_B) {
          return [EVAL_ACCOUNTS.ACCOUNT_B1];
        }
        return [];
      }),
    };

    const mockTransactionService = {
      create: jest.fn().mockImplementation(async (userId: string, dto: any) => {
        if (
          userId === EVAL_USERS.USER_A &&
          dto.accountId !== EVAL_ACCOUNTS.ACCOUNT_A1.id
        ) {
          const { NotFoundException } = await import('@nestjs/common');
          throw new NotFoundException('Account not found');
        }
        return {
          id: `tx-eval-created-${Date.now()}`,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          source: dto.source ?? 'MANUAL',
          transactionAt: dto.transactionAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }),
      findByUserId: jest
        .fn()
        .mockImplementation(
          async (userId: string, query?: { accountId?: string }) => {
            if (scenario.serviceOverrides?.transactionsFailure) {
              throw new Error('Transaction service failure');
            }
            if (scenario.serviceOverrides?.emptyTransactions) {
              return [];
            }
            if (query?.accountId) {
              if (
                query.accountId === EVAL_ACCOUNTS.ACCOUNT_B1.id &&
                userId !== EVAL_USERS.USER_B
              ) {
                const { NotFoundException } = await import('@nestjs/common');
                throw new NotFoundException('Account not found');
              }
              if (
                query.accountId === EVAL_ACCOUNTS.ACCOUNT_A1.id &&
                userId === EVAL_USERS.USER_A
              ) {
                return [EVAL_TRANSACTIONS.TX_A1];
              }
            }
            if (userId === EVAL_USERS.USER_A) {
              return [EVAL_TRANSACTIONS.TX_A1];
            }
            if (userId === EVAL_USERS.USER_B) {
              return [EVAL_TRANSACTIONS.TX_B1];
            }
            return [];
          },
        ),
    };

    const mockFinancialSummaryService = {
      getSummary: jest.fn().mockImplementation(async (userId: string) => {
        await Promise.resolve();
        if (scenario.serviceOverrides?.summaryFailure) {
          throw new Error('Summary service failure');
        }
        if (userId === EVAL_USERS.USER_A) {
          return EVAL_SUMMARIES.SUMMARY_A_SEP;
        }
        return { totals: { totalBalance: 0 }, accounts: [], period: {} };
      }),
    };

    const mockBudgetService = {
      findByUserId: jest
        .fn()
        .mockImplementation(
          async (userId: string, query?: { categoryId?: string }) => {
            await Promise.resolve();
            if (scenario.serviceOverrides?.budgetsFailure) {
              throw new Error('Budget service failure');
            }
            if (scenario.serviceOverrides?.emptyBudgets) {
              return [];
            }
            if (
              query?.categoryId &&
              query.categoryId === EVAL_BUDGETS.BUDGET_B1.categoryId &&
              userId !== EVAL_USERS.USER_B
            ) {
              return [];
            }
            if (userId === EVAL_USERS.USER_A) {
              return [EVAL_BUDGETS.BUDGET_A1];
            }
            if (userId === EVAL_USERS.USER_B) {
              return [EVAL_BUDGETS.BUDGET_B1];
            }
            return [];
          },
        ),
    };

    const conversationsMap = new Map<string, any>();
    const messagesMap = new Map<string, any[]>();

    const mockDatabaseService = {
      aiConfirmation: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const id = `conf-eval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const record = {
            id,
            userId: data.userId,
            toolName: data.toolName,
            argumentsJson: data.argumentsJson,
            status: data.status ?? 'PENDING',
            createdAt: new Date(),
            expiresAt: data.expiresAt,
            consumedAt: null,
          };
          confirmationsMap.set(id, record);
          return record;
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }: any) => {
          const record = confirmationsMap.get(where.id);
          if (
            record &&
            record.userId === where.userId &&
            record.status === (where.status ?? 'PENDING') &&
            (!where.expiresAt?.gt || record.expiresAt > where.expiresAt.gt)
          ) {
            record.status = data.status;
            if (data.consumedAt) record.consumedAt = data.consumedAt;
            return { count: 1 };
          }
          return { count: 0 };
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          return confirmationsMap.get(where.id) ?? null;
        }),
        findUniqueOrThrow: jest.fn().mockImplementation(({ where }: any) => {
          const rec = confirmationsMap.get(where.id);
          if (!rec) throw new Error('Record not found');
          return rec;
        }),
      },
      aiAuditEvent: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const rec = {
            id: `audit-${Date.now()}`,
            createdAt: new Date(),
            ...data,
          };
          auditsList.push(rec);
          return Promise.resolve(rec);
        }),
      },
      aiConversation: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const id = `conv-eval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const record = {
            id,
            userId: data.userId,
            title: data.title,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          conversationsMap.set(id, record);
          messagesMap.set(id, []);
          return Promise.resolve(record);
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          for (const conv of conversationsMap.values()) {
            if (
              conv.id === where.id &&
              (!where.userId || conv.userId === where.userId)
            ) {
              return Promise.resolve(conv);
            }
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          const list = Array.from(conversationsMap.values()).filter(
            (c) => !where?.userId || c.userId === where.userId,
          );
          return Promise.resolve(list);
        }),
        count: jest.fn().mockImplementation(({ where }: any) => {
          const list = Array.from(conversationsMap.values()).filter(
            (c) => !where?.userId || c.userId === where.userId,
          );
          return Promise.resolve(list.length);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          const conv = conversationsMap.get(where.id);
          if (conv) {
            if (data.updatedAt) conv.updatedAt = data.updatedAt;
          }
          return Promise.resolve(conv);
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          conversationsMap.delete(where.id);
          messagesMap.delete(where.id);
          return Promise.resolve({ id: where.id });
        }),
      },
      aiConversationMessage: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          const id = `msg-eval-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const record = {
            id,
            conversationId: data.conversationId,
            role: data.role,
            content: data.content,
            sequenceNumber: data.sequenceNumber,
            createdAt: new Date(),
          };
          const msgs = messagesMap.get(data.conversationId) || [];
          msgs.push(record);
          messagesMap.set(data.conversationId, msgs);
          return Promise.resolve(record);
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          const msgs = messagesMap.get(where.conversationId) || [];
          return Promise.resolve([...msgs]);
        }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          const msgs = messagesMap.get(where.conversationId) || [];
          if (msgs.length === 0) return Promise.resolve(null);
          return Promise.resolve(msgs[msgs.length - 1]);
        }),
        count: jest.fn().mockImplementation(({ where }: any) => {
          const msgs = messagesMap.get(where.conversationId) || [];
          return Promise.resolve(msgs.length);
        }),
      },
      $transaction: jest
        .fn()
        .mockImplementation((promises: any[]) => Promise.all(promises)),
    };

    const mockMetricsService = {
      increment: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue(300),
    };

    const mockOpenAiClient = new MockOpenAIClientEvaluation();
    mockOpenAiClient.setResponseQueue(scenario.mockModelResponses ?? []);

    // Intercept model calls to record model-requested function calls
    const originalCreateRawResponse =
      mockOpenAiClient.createRawResponse.bind(mockOpenAiClient);
    mockOpenAiClient.createRawResponse = async (params: any) => {
      const response = await originalCreateRawResponse(params);
      for (const fc of response.functionCalls) {
        observedModelCalls.push({
          toolName: fc.name,
          arguments: fc.arguments ?? {},
          callId: fc.callId,
        });
      }
      return response;
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentService,
        AiAgentOrchestratorService,
        AiAgentObservabilityService,
        AgentToolRegistryService,
        AgentToolAuthorizationService,
        AgentToolArgumentValidatorService,
        AiConfirmationService,
        AiConversationRepository,
        AiConversationService,
        GetAccountsTool,
        GetTransactionsTool,
        GetFinancialSummaryTool,
        GetBudgetsTool,
        CreateTransactionTool,
        { provide: OpenAIClient, useValue: mockOpenAiClient },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: TransactionService, useValue: mockTransactionService },
        {
          provide: FinancialSummaryService,
          useValue: mockFinancialSummaryService,
        },
        { provide: BudgetService, useValue: mockBudgetService },
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    const registry = moduleRef.get<AgentToolRegistryService>(
      AgentToolRegistryService,
    );
    registry.onModuleInit();

    // Wrap actual tool execution to record executed tool calls
    for (const tool of registry.getTools()) {
      const originalExecute = tool.execute.bind(tool);
      (tool as any).execute = async (context: any, input: any) => {
        executedToolCalls.push({
          toolName: tool.name,
          arguments: input ?? {},
        });
        return await originalExecute(context, input);
      };
    }

    const recordedEvents: any[] = [];
    const observabilityService = moduleRef.get<AiAgentObservabilityService>(
      AiAgentObservabilityService,
    );
    const originalRecordEvent =
      observabilityService.recordEvent.bind(observabilityService);
    observabilityService.recordEvent = async (event: any) => {
      recordedEvents.push(event);
      return await originalRecordEvent(event);
    };

    const agentService = moduleRef.get<AiAgentService>(AiAgentService);

    let finalResponse: string | undefined = undefined;
    let agentResponseObj: AgentResponse | undefined = undefined;
    let caughtError: unknown = undefined;

    try {
      agentResponseObj = await agentService.sendMessage(
        scenario.authenticatedUserId,
        scenario.userMessage,
      );
      finalResponse = agentResponseObj.message;
    } catch (err) {
      caughtError = err;
    }

    const durationMs = Date.now() - startTime;

    // --- Assertions & Violations Evaluation ---

    // 1. Max Iterations / Service Error Check
    if (scenario.expectedBehavior.expectMaxIterationsReached) {
      const errDetail =
        caughtError instanceof Error
          ? caughtError.message
          : JSON.stringify(caughtError);
      if (
        !(caughtError instanceof ServiceUnavailableException) ||
        !errDetail.includes('maximum allowed tool steps')
      ) {
        violations.push({
          type: 'max_iterations_failed',
          message: `Expected ServiceUnavailableException for max iterations, but got: ${errDetail}`,
        });
      }
    } else if (caughtError) {
      const errDetail =
        caughtError instanceof Error
          ? (caughtError.stack ?? caughtError.message)
          : JSON.stringify(caughtError);
      console.log(`[SCENARIO ${scenario.id} CAUGHT ERROR]:`, errDetail);
      violations.push({
        type: 'unexpected_orchestrator_exception',
        message: `Unexpected orchestrator error: ${errDetail}`,
      });
    }

    // 2. Expected Confirmation Required Check
    if (scenario.expectedBehavior.expectConfirmationRequired) {
      if (
        agentResponseObj?.type !== 'confirmation_required' ||
        !agentResponseObj?.confirmation
      ) {
        violations.push({
          type: 'missing_expected_confirmation',
          message: `Expected confirmation_required response, but got type: '${agentResponseObj?.type}'`,
        });
      }
    }

    // 3. Expected Tool Calls (Model requested tool)
    if (scenario.expectedBehavior.expectedToolCalls) {
      for (const expectedCall of scenario.expectedBehavior.expectedToolCalls) {
        const matchingCall = observedModelCalls.find(
          (c) => c.toolName === expectedCall.toolName,
        );
        if (!matchingCall) {
          violations.push({
            type: 'missing_expected_tool_call',
            message: `Expected tool call to '${expectedCall.toolName}' was not observed`,
          });
        } else if (expectedCall.arguments) {
          for (const [key, val] of Object.entries(expectedCall.arguments)) {
            const expectedValStr = JSON.stringify(val);
            const actualValStr = JSON.stringify(matchingCall.arguments[key]);
            if (matchingCall.arguments[key] !== val) {
              violations.push({
                type: 'incorrect_tool_argument',
                message: `Tool '${expectedCall.toolName}' argument mismatch for key '${key}': expected '${expectedValStr}', got '${actualValStr}'`,
              });
            }
          }
        }
      }
    }

    // 4. Forbidden Tool Calls (Must NOT be executed by application registry)
    if (scenario.expectedBehavior.forbiddenToolCalls) {
      for (const forbiddenTool of scenario.expectedBehavior
        .forbiddenToolCalls) {
        const foundForbiddenExecuted = executedToolCalls.find(
          (c) => c.toolName === forbiddenTool,
        );
        if (foundForbiddenExecuted) {
          violations.push({
            type: 'forbidden_tool_call_executed',
            message: `Forbidden tool call '${forbiddenTool}' was executed by application registry`,
          });
        }
      }
    }

    // 5. Ordered Tool Sequence
    if (
      scenario.expectedBehavior.orderedToolSequence &&
      scenario.expectedBehavior.expectedToolCalls
    ) {
      const expectedNames = scenario.expectedBehavior.expectedToolCalls.map(
        (e) => e.toolName,
      );
      const observedNames = observedModelCalls.map((o) => o.toolName);
      if (JSON.stringify(expectedNames) !== JSON.stringify(observedNames)) {
        violations.push({
          type: 'incorrect_tool_sequence',
          message: `Tool sequence mismatch: expected [${expectedNames.join(', ')}], got [${observedNames.join(', ')}]`,
        });
      }
    }

    // 6. Observability Event Assertions
    if (scenario.expectedBehavior.expectObservabilityEvents) {
      for (const evtName of scenario.expectedBehavior
        .expectObservabilityEvents) {
        const found = recordedEvents.some((e) => e.event === evtName);
        if (!found) {
          violations.push({
            type: 'missing_observability_event',
            message: `Expected observability event '${evtName}' was not emitted`,
          });
        }
      }
    }

    if (scenario.expectedBehavior.expectAuditPersisted) {
      if (auditsList.length === 0) {
        violations.push({
          type: 'missing_audit_event',
          message:
            'Expected financial audit log persistence, but none was recorded in DB',
        });
      }
    }

    if (scenario.expectedBehavior.expectRedactedKeys) {
      for (const key of scenario.expectedBehavior.expectRedactedKeys) {
        const hasUnredactedInAudits = auditsList.some((audit) => {
          const meta = audit.metadata;
          return meta && meta[key] && meta[key] !== '[REDACTED]';
        });
        if (hasUnredactedInAudits) {
          violations.push({
            type: 'unredacted_key_in_audit',
            message: `Key '${key}' was found unredacted in database audit event metadata`,
          });
        }
      }
    }

    // 7. Response Text Assertions
    if (finalResponse) {
      if (scenario.expectedBehavior.responseMustContain) {
        for (const substring of scenario.expectedBehavior.responseMustContain) {
          if (!finalResponse.includes(substring)) {
            violations.push({
              type: 'missing_response_substring',
              message: `Response did not contain required text '${substring}'. Response: "${finalResponse}"`,
            });
          }
        }
      }

      if (scenario.expectedBehavior.responseMustNotContain) {
        for (const substring of scenario.expectedBehavior
          .responseMustNotContain) {
          if (finalResponse.includes(substring)) {
            violations.push({
              type: 'prohibited_response_substring_observed',
              message: `Response contained prohibited text '${substring}'. Response: "${finalResponse}"`,
            });
          }
        }
      }
    }

    const passed = violations.length === 0;

    return {
      scenarioId: scenario.id,
      category: scenario.category,
      description: scenario.description,
      passed,
      violations,
      observedToolCalls: observedModelCalls,
      finalResponse,
      iterationCount: observedModelCalls.length,
      durationMs,
    };
  }

  async runAll(
    scenarios: AgentEvaluationScenario[],
  ): Promise<EvaluationReport> {
    const results: EvaluationResult[] = [];
    const categorySummary: Record<string, CategorySummary> = {};

    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);

      const category = scenario.category as string;
      if (!categorySummary[category]) {
        categorySummary[category] = { total: 0, passed: 0, failed: 0 };
      }
      categorySummary[category].total++;
      if (result.passed) {
        categorySummary[category].passed++;
      } else {
        categorySummary[category].failed++;
      }
    }

    const totalScenarios = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = totalScenarios - passed;
    const passRate =
      totalScenarios > 0
        ? parseFloat(((passed / totalScenarios) * 100).toFixed(2))
        : 100;

    return {
      totalScenarios,
      passed,
      failed,
      passRate,
      results,
      categorySummary: categorySummary,
    };
  }
}
