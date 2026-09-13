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
import { AiMemoryRepository } from '../../../src/ai-agent/infrastructure/repositories/ai-memory.repository';
import { AiMemoryPolicyService } from '../../../src/ai-agent/application/memory/ai-memory-policy.service';
import { AiMemoryService } from '../../../src/ai-agent/application/memory/ai-memory.service';
import { SaveMemoryTool } from '../../../src/ai-agent/application/tools/impl/save-memory.tool';
import { UpdateTransactionTool } from '../../../src/ai-agent/application/tools/impl/update-transaction.tool';
import { DeleteTransactionTool } from '../../../src/ai-agent/application/tools/impl/delete-transaction.tool';
import { CreateTransferTool } from '../../../src/ai-agent/application/tools/impl/create-transfer.tool';
import { UpdateTransferTool } from '../../../src/ai-agent/application/tools/impl/update-transfer.tool';
import { TransferService } from '../../../src/transfer/transfer.service';

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
  EVAL_CATEGORIES,
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
    const memoriesMap = new Map<string, any>();

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
      update: jest
        .fn()
        .mockImplementation(async (id: string, userId: string, dto: any) => {
          if (
            id === 'a0000000-0000-4000-8000-000000000000' ||
            id === EVAL_TRANSACTIONS.TX_B1.id
          ) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('Transaction not found');
          }
          if (
            id === EVAL_TRANSACTIONS.TX_TRANSFER.id ||
            id === EVAL_TRANSACTIONS.TX_SYSTEM.id
          ) {
            const { BadRequestException } = await import('@nestjs/common');
            throw new BadRequestException(
              'Cannot modify transfer-linked or system transactions',
            );
          }
          if (dto.accountId === EVAL_ACCOUNTS.ACCOUNT_INACTIVE.id) {
            const { BadRequestException } = await import('@nestjs/common');
            throw new BadRequestException('Cannot assign an inactive account');
          }
          if (
            dto.accountId === EVAL_ACCOUNTS.ACCOUNT_B1.id ||
            dto.accountId === 'acc-non-existent'
          ) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('Account not found');
          }
          if (
            dto.categoryId === EVAL_CATEGORIES.INCOME_CAT.id &&
            dto.type === 'EXPENSE'
          ) {
            const { BadRequestException } = await import('@nestjs/common');
            throw new BadRequestException(
              'Category type does not match transaction type',
            );
          }
          if (dto.amount && dto.amount > 99999) {
            const { BadRequestException } = await import('@nestjs/common');
            throw new BadRequestException('Insufficient balance');
          }
          return {
            id,
            accountId: dto.accountId ?? EVAL_ACCOUNTS.ACCOUNT_A1.id,
            categoryId: dto.categoryId ?? EVAL_TRANSACTIONS.TX_A1.categoryId,
            type: dto.type ?? EVAL_TRANSACTIONS.TX_A1.type,
            amount: dto.amount ?? EVAL_TRANSACTIONS.TX_A1.amount,
            description: dto.description ?? EVAL_TRANSACTIONS.TX_A1.description,
            source: 'MANUAL',
            transactionAt:
              dto.transactionAt ?? EVAL_TRANSACTIONS.TX_A1.transactionAt,
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
      delete: jest
        .fn()
        .mockImplementation(async (id: string, userId: string) => {
          if (
            id === 'a0000000-0000-4000-8000-000000000000' ||
            (id === EVAL_TRANSACTIONS.TX_B1.id && userId === EVAL_USERS.USER_A)
          ) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('Transaction not found');
          }
          if (
            id === EVAL_TRANSACTIONS.TX_TRANSFER.id ||
            id === EVAL_TRANSACTIONS.TX_SYSTEM.id
          ) {
            const { BadRequestException } = await import('@nestjs/common');
            throw new BadRequestException(
              'Cannot delete transfer-linked or system transactions',
            );
          }
          return;
        }),
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

    const mockTransferService = {
      create: jest.fn().mockImplementation(async (userId: string, dto: any) => {
        if (dto.fromAccountId === dto.toAccountId) {
          const { BadRequestException } = await import('@nestjs/common');
          throw new BadRequestException(
            'Source and destination accounts must be different',
          );
        }
        if (
          dto.fromAccountId === EVAL_ACCOUNTS.ACCOUNT_B1.id ||
          dto.toAccountId === EVAL_ACCOUNTS.ACCOUNT_B1.id
        ) {
          if (userId === EVAL_USERS.USER_A) {
            const { NotFoundException } = await import('@nestjs/common');
            throw new NotFoundException('Account not found');
          }
        }
        if (
          dto.fromAccountId === EVAL_ACCOUNTS.ACCOUNT_INACTIVE.id ||
          dto.toAccountId === EVAL_ACCOUNTS.ACCOUNT_INACTIVE.id
        ) {
          const { BadRequestException } = await import('@nestjs/common');
          throw new BadRequestException(
            'Cannot perform transfer with an inactive account',
          );
        }
        if (dto.amount > 99999) {
          const { BadRequestException } = await import('@nestjs/common');
          throw new BadRequestException('Insufficient balance for transfer');
        }
        return {
          id: 'tr-eval-1111-1111-1111',
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount: dto.amount,
          transactionAt: dto.transactionAt,
          createdAt: new Date(),
        };
      }),
      update: jest
        .fn()
        .mockImplementation(
          async (transferId: string, userId: string, dto: any) => {
            // IDOR: cross-user transfer not found
            if (
              transferId === 'f3333333-3333-4333-8333-333333333333' &&
              userId === EVAL_USERS.USER_A
            ) {
              const { NotFoundException } = await import('@nestjs/common');
              throw new NotFoundException('Transfer not found');
            }
            // Non-existent transfer
            if (transferId === 'a0000000-0000-4000-8000-000000000000') {
              const { NotFoundException } = await import('@nestjs/common');
              throw new NotFoundException('Transfer not found');
            }
            // Same account guard
            if (
              dto.fromAccountId &&
              dto.toAccountId &&
              dto.fromAccountId === dto.toAccountId
            ) {
              const { BadRequestException } = await import('@nestjs/common');
              throw new BadRequestException(
                'Source and destination accounts must be different',
              );
            }
            // Inactive account
            if (
              dto.fromAccountId === EVAL_ACCOUNTS.ACCOUNT_INACTIVE.id ||
              dto.toAccountId === EVAL_ACCOUNTS.ACCOUNT_INACTIVE.id
            ) {
              const { BadRequestException } = await import('@nestjs/common');
              throw new BadRequestException(
                'Cannot perform transfer with an inactive account',
              );
            }
            // Cross-user account (USER_A accessing USER_B account)
            if (
              userId === EVAL_USERS.USER_A &&
              (dto.fromAccountId === EVAL_ACCOUNTS.ACCOUNT_B1.id ||
                dto.toAccountId === EVAL_ACCOUNTS.ACCOUNT_B1.id)
            ) {
              const { NotFoundException } = await import('@nestjs/common');
              throw new NotFoundException('Account not found');
            }
            // Insufficient balance guard (large amounts)
            if (dto.amount && dto.amount > 99999) {
              const { BadRequestException } = await import('@nestjs/common');
              throw new BadRequestException(
                'Insufficient balance for transfer',
              );
            }
            return {
              id: transferId,
              fromAccountId: dto.fromAccountId ?? EVAL_ACCOUNTS.ACCOUNT_A1.id,
              toAccountId: dto.toAccountId ?? EVAL_ACCOUNTS.ACCOUNT_A2.id,
              amount: dto.amount ?? 100.0,
              transactionAt:
                dto.transactionAt ?? new Date('2026-09-13T15:30:00.000Z'),
              createdAt: new Date(),
              updatedAt: new Date(),
            };
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
      aiMemory: {
        upsert: jest
          .fn()
          .mockImplementation(({ where, update, create }: any) => {
            const keyStr = `${where.userId_type_key.userId}:${where.userId_type_key.type}:${where.userId_type_key.key}`;
            let record = memoriesMap.get(keyStr);
            if (record) {
              record.value = update.value;
              record.updatedAt = new Date();
            } else {
              record = {
                id: `mem-eval-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                userId: create.userId,
                type: create.type,
                key: create.key,
                value: create.value,
                createdAt: new Date(),
                updatedAt: new Date(),
              };
              memoriesMap.set(keyStr, record);
            }
            return Promise.resolve(record);
          }),
        findFirst: jest.fn().mockImplementation(({ where }: any) => {
          for (const mem of memoriesMap.values()) {
            if (
              (!where.id || mem.id === where.id) &&
              (!where.userId || mem.userId === where.userId) &&
              (!where.type || mem.type === where.type) &&
              (!where.key || mem.key === where.key)
            ) {
              return Promise.resolve(mem);
            }
          }
          return Promise.resolve(null);
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          const list = Array.from(memoriesMap.values()).filter((mem) => {
            if (where?.userId && mem.userId !== where.userId) return false;
            if (where?.type && mem.type !== where.type) return false;
            return true;
          });
          return Promise.resolve(list);
        }),
        count: jest.fn().mockImplementation(({ where }: any) => {
          const list = Array.from(memoriesMap.values()).filter(
            (m) => !where?.userId || m.userId === where.userId,
          );
          return Promise.resolve(list.length);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          for (const mem of memoriesMap.values()) {
            if (mem.id === where.id) {
              if (data.value !== undefined) mem.value = data.value;
              mem.updatedAt = new Date();
              return Promise.resolve(mem);
            }
          }
          return Promise.resolve(null);
        }),
        delete: jest.fn().mockImplementation(({ where }: any) => {
          for (const [k, mem] of memoriesMap.entries()) {
            if (mem.id === where.id) {
              memoriesMap.delete(k);
              return Promise.resolve(mem);
            }
          }
          return Promise.resolve(null);
        }),
        deleteMany: jest.fn().mockImplementation(({ where }: any) => {
          let count = 0;
          for (const [k, mem] of Array.from(memoriesMap.entries())) {
            if (!where?.userId || mem.userId === where.userId) {
              memoriesMap.delete(k);
              count++;
            }
          }
          return Promise.resolve({ count });
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
        AiMemoryRepository,
        AiMemoryPolicyService,
        AiMemoryService,
        GetAccountsTool,
        GetTransactionsTool,
        GetFinancialSummaryTool,
        GetBudgetsTool,
        CreateTransactionTool,
        SaveMemoryTool,
        UpdateTransactionTool,
        DeleteTransactionTool,
        CreateTransferTool,
        UpdateTransferTool,
        { provide: OpenAIClient, useValue: mockOpenAiClient },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: AccountService, useValue: mockAccountService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: TransferService, useValue: mockTransferService },
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
