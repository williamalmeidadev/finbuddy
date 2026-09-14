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
import { DeleteTransferTool } from '../../../src/ai-agent/application/tools/impl/delete-transfer.tool';
import { CategoryService } from '../../../src/category/category.service';
import { GetCategoriesTool } from '../../../src/ai-agent/application/tools/impl/get-categories.tool';
import { CreateCategoryTool } from '../../../src/ai-agent/application/tools/impl/create-category.tool';
import { TransferService } from '../../../src/transfer/transfer.service';

import { calculateModelCost } from '../../../src/ai-agent/application/evaluation/pricing/model-pricing.config';
import {
  AgentEvaluationScenario,
  CategorySummary,
  EvaluationReport,
  EvaluationResult,
  EvaluationViolation,
  ObservedToolCall,
  RegressionComparisonReport,
  RepeatedRunMetrics,
  ScenarioFailureReason,
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
      delete: jest
        .fn()
        .mockImplementation(async (transferId: string, userId: string) => {
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
          return {
            id: transferId,
            fromAccountId: EVAL_ACCOUNTS.ACCOUNT_A1.id,
            toAccountId: EVAL_ACCOUNTS.ACCOUNT_A2.id,
            amount: 100.0,
            transactionAt: new Date('2026-09-13T15:30:00.000Z'),
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }),
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
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'AI_CONFIRMATION_TTL_SECONDS') return 300;
        if (key === 'OPENAI_MAX_TOOL_ITERATIONS') return 5;
        if (key === 'OPENAI_MAX_MODEL_CALLS') return 10;
        if (key === 'AI_MAX_INPUT_CHARS') return 2000;
        if (key === 'AI_MAX_CONTEXT_CHARS') return 15000;
        if (key === 'AI_MAX_MEMORY_CONTEXT_CHARS') return 2000;
        if (key === 'AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD') return 5;
        if (key === 'AI_CIRCUIT_BREAKER_RESET_TIMEOUT_MS') return 30000;
        if (key === 'AI_MAX_CONCURRENT_REQUESTS_PER_USER') return 3;
        return undefined;
      }),
    };

    let modelCallsCount = 0;
    let inputTokensSum = 0;
    let outputTokensSum = 0;
    let totalTokensSum = 0;
    let cachedTokensSum = 0;
    let reasoningTokensSum = 0;
    let estimatedCostUsdSum = 0;
    let pricingAvailable = true;

    const mockOpenAiClient = new MockOpenAIClientEvaluation(
      mockConfigService as any,
    );
    mockOpenAiClient.setResponseQueue(scenario.mockModelResponses ?? []);

    // Intercept model calls to record model-requested function calls & token accounting
    const originalCreateRawResponse =
      mockOpenAiClient.createRawResponse.bind(mockOpenAiClient);
    mockOpenAiClient.createRawResponse = async (params: any) => {
      const response = await originalCreateRawResponse(params);
      modelCallsCount++;
      for (const fc of response.functionCalls) {
        observedModelCalls.push({
          toolName: fc.name,
          arguments: fc.arguments ?? {},
          callId: fc.callId,
        });
      }
      if (response.usage) {
        const inp = response.usage.inputTokens ?? 0;
        const out = response.usage.outputTokens ?? 0;
        const tot = response.usage.totalTokens ?? inp + out;
        const cac = response.usage.cachedTokens ?? 0;
        const rea = response.usage.reasoningTokens ?? 0;

        inputTokensSum += inp;
        outputTokensSum += out;
        totalTokensSum += tot;
        cachedTokensSum += cac;
        reasoningTokensSum += rea;

        const costCalc = calculateModelCost(response.model ?? 'gpt-5.5', {
          inputTokens: inp,
          outputTokens: out,
          cachedInputTokens: cac,
        });

        if (
          costCalc.pricingAvailable &&
          costCalc.estimatedTotalCost !== undefined
        ) {
          estimatedCostUsdSum += costCalc.estimatedTotalCost;
        } else {
          pricingAvailable = false;
        }
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
        GetCategoriesTool,
        CreateCategoryTool,
        CreateTransactionTool,
        SaveMemoryTool,
        UpdateTransactionTool,
        DeleteTransactionTool,
        CreateTransferTool,
        UpdateTransferTool,
        DeleteTransferTool,
        { provide: OpenAIClient, useValue: mockOpenAiClient },
        { provide: MetricsService, useValue: mockMetricsService },
        { provide: AccountService, useValue: mockAccountService },
        {
          provide: CategoryService,
          useValue: {
            findByUserId: jest.fn().mockResolvedValue([]),
            create: jest
              .fn()
              .mockResolvedValue({ id: 'cat-mock-1', name: 'Mock Cat' }),
          },
        },
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
    } else if (scenario.expectedBehavior.expectServiceError) {
      if (!caughtError) {
        violations.push({
          type: 'expected_service_error_missing',
          message:
            'Expected service error, but request completed without error',
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

    // Budget Limits Assertions
    const budgetViolations: EvaluationViolation[] = [];
    if (scenario.budgetLimits) {
      if (
        scenario.budgetLimits.maxModelCalls !== undefined &&
        modelCallsCount > scenario.budgetLimits.maxModelCalls
      ) {
        budgetViolations.push({
          type: 'budget_limit_exceeded',
          message: `Model calls limit exceeded: ${modelCallsCount} > ${scenario.budgetLimits.maxModelCalls}`,
        });
      }
      if (
        scenario.budgetLimits.maxToolCalls !== undefined &&
        executedToolCalls.length > scenario.budgetLimits.maxToolCalls
      ) {
        budgetViolations.push({
          type: 'budget_limit_exceeded',
          message: `Tool calls limit exceeded: ${executedToolCalls.length} > ${scenario.budgetLimits.maxToolCalls}`,
        });
      }
      if (
        scenario.budgetLimits.maxTotalTokens !== undefined &&
        totalTokensSum > scenario.budgetLimits.maxTotalTokens
      ) {
        budgetViolations.push({
          type: 'budget_limit_exceeded',
          message: `Total tokens limit exceeded: ${totalTokensSum} > ${scenario.budgetLimits.maxTotalTokens}`,
        });
      }
      if (
        scenario.budgetLimits.maxEstimatedCostUsd !== undefined &&
        estimatedCostUsdSum > scenario.budgetLimits.maxEstimatedCostUsd
      ) {
        budgetViolations.push({
          type: 'budget_limit_exceeded',
          message: `Estimated cost limit exceeded: $${estimatedCostUsdSum.toFixed(6)} > $${scenario.budgetLimits.maxEstimatedCostUsd}`,
        });
      }
      if (
        scenario.budgetLimits.maxDurationMs !== undefined &&
        durationMs > scenario.budgetLimits.maxDurationMs
      ) {
        budgetViolations.push({
          type: 'budget_limit_exceeded',
          message: `Duration limit exceeded: ${durationMs}ms > ${scenario.budgetLimits.maxDurationMs}ms`,
        });
      }
    }

    if (scenario.expectedBehavior.expectBudgetLimitExceeded) {
      if (budgetViolations.length === 0) {
        violations.push({
          type: 'expected_budget_limit_not_exceeded',
          message:
            'Expected budget limit to be exceeded, but all budget bounds were met',
        });
      }
    } else {
      violations.push(...budgetViolations);
    }

    const passed = violations.length === 0;

    let failureReason: ScenarioFailureReason | undefined = undefined;
    if (!passed) {
      const types = violations.map((v) => v.type);
      if (types.includes('max_iterations_failed')) {
        failureReason = 'ITERATION_LIMIT';
      } else if (types.some((t) => t.includes('budget_limit_exceeded'))) {
        const bMsg =
          violations.find((v) => v.type === 'budget_limit_exceeded')?.message ??
          '';
        if (bMsg.includes('tokens')) failureReason = 'TOKEN_LIMIT';
        else if (bMsg.includes('cost')) failureReason = 'COST_LIMIT';
        else if (bMsg.includes('duration')) failureReason = 'LATENCY_LIMIT';
        else if (bMsg.includes('Model calls')) failureReason = 'MODEL_ERROR';
        else failureReason = 'UNKNOWN';
      } else if (
        types.includes('missing_expected_tool_call') ||
        types.includes('forbidden_tool_call_executed') ||
        types.includes('incorrect_tool_sequence')
      ) {
        failureReason = 'TOOL_SELECTION';
      } else if (types.includes('incorrect_tool_argument')) {
        failureReason = 'ARGUMENT_VALIDATION';
      } else if (types.includes('missing_expected_confirmation')) {
        failureReason = 'CONFIRMATION';
      } else if (
        types.includes('missing_response_substring') ||
        types.includes('prohibited_response_substring_observed')
      ) {
        failureReason = 'GROUNDING';
      } else if (
        scenario.category === 'memory-management' ||
        scenario.category === 'MEMORY-BEHAVIOR'
      ) {
        failureReason = 'MEMORY';
      } else if (
        types.includes('expected_service_error_missing') ||
        types.includes('unexpected_orchestrator_exception')
      ) {
        failureReason = 'MODEL_ERROR';
      } else {
        failureReason = 'UNKNOWN';
      }
    }

    return {
      scenarioId: scenario.id,
      category: scenario.category,
      description: scenario.description,
      passed,
      failureReason,
      violations,
      observedToolCalls: observedModelCalls,
      finalResponse,
      iterationCount: observedModelCalls.length,
      durationMs,
      tokenUsage: {
        inputTokens: inputTokensSum,
        outputTokens: outputTokensSum,
        totalTokens: totalTokensSum,
        cachedTokens: cachedTokensSum,
        reasoningTokens: reasoningTokensSum,
      },
      estimatedCostUsd: parseFloat(estimatedCostUsdSum.toFixed(6)),
      pricingAvailable,
      modelCallsCount,
      toolCallsCount: executedToolCalls.length,
    };
  }

  async runAll(
    scenarios: AgentEvaluationScenario[],
  ): Promise<EvaluationReport> {
    const results: EvaluationResult[] = [];
    const categorySummary: Record<string, CategorySummary> = {};

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalTokensAll = 0;
    let totalCachedTokens = 0;
    let totalReasoningTokens = 0;
    let totalEstimatedCostUsd = 0;
    let totalDurationMs = 0;
    let allPricingAvailable = true;

    for (const scenario of scenarios) {
      const result = await this.runScenario(scenario);
      results.push(result);

      totalInputTokens += result.tokenUsage.inputTokens;
      totalOutputTokens += result.tokenUsage.outputTokens;
      totalTokensAll += result.tokenUsage.totalTokens;
      totalCachedTokens += result.tokenUsage.cachedTokens;
      totalReasoningTokens += result.tokenUsage.reasoningTokens;
      totalEstimatedCostUsd += result.estimatedCostUsd ?? 0;
      totalDurationMs += result.durationMs;
      if (!result.pricingAvailable) {
        allPricingAvailable = false;
      }

      const category = scenario.category;
      if (!categorySummary[category]) {
        categorySummary[category] = {
          total: 0,
          passed: 0,
          failed: 0,
          passRate: 0,
          totalTokens: 0,
          totalCostUsd: 0,
        };
      }
      categorySummary[category].total++;
      categorySummary[category].totalTokens += result.tokenUsage.totalTokens;
      categorySummary[category].totalCostUsd += result.estimatedCostUsd ?? 0;
      if (result.passed) {
        categorySummary[category].passed++;
      } else {
        categorySummary[category].failed++;
      }
      categorySummary[category].passRate = parseFloat(
        (
          (categorySummary[category].passed / categorySummary[category].total) *
          100
        ).toFixed(2),
      );
    }

    const totalScenarios = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = totalScenarios - passed;
    const passRate =
      totalScenarios > 0
        ? parseFloat(((passed / totalScenarios) * 100).toFixed(2))
        : 100;

    return {
      timestamp: new Date().toISOString(),
      totalScenarios,
      passed,
      failed,
      passRate,
      totalDurationMs,
      totalTokens: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        totalTokens: totalTokensAll,
        cachedTokens: totalCachedTokens,
        reasoningTokens: totalReasoningTokens,
      },
      totalEstimatedCostUsd: parseFloat(totalEstimatedCostUsd.toFixed(6)),
      allPricingAvailable,
      results,
      categorySummary,
    };
  }

  async runRepeated(
    scenario: AgentEvaluationScenario,
    iterationsCount: number = 5,
  ): Promise<RepeatedRunMetrics> {
    const durations: number[] = [];
    let passCount = 0;
    let failCount = 0;
    let totalTokensSum = 0;
    let totalCostSum = 0;

    for (let i = 0; i < iterationsCount; i++) {
      const res = await this.runScenario(scenario);
      durations.push(res.durationMs);
      totalTokensSum += res.tokenUsage.totalTokens;
      totalCostSum += res.estimatedCostUsd ?? 0;
      if (res.passed) passCount++;
      else failCount++;
    }

    durations.sort((a, b) => a - b);
    const minDurationMs = durations[0] ?? 0;
    const maxDurationMs = durations[durations.length - 1] ?? 0;
    const avgDurationMs =
      durations.reduce((acc, d) => acc + d, 0) / (durations.length || 1);
    const p50Index = Math.floor(durations.length * 0.5);
    const p95Index = Math.min(
      Math.floor(durations.length * 0.95),
      durations.length - 1,
    );

    return {
      scenarioId: scenario.id,
      runsCount: iterationsCount,
      passCount,
      failCount,
      passRate: parseFloat(((passCount / iterationsCount) * 100).toFixed(2)),
      minDurationMs,
      maxDurationMs,
      avgDurationMs: parseFloat(avgDurationMs.toFixed(2)),
      p50DurationMs: durations[p50Index] ?? 0,
      p95DurationMs: durations[p95Index] ?? 0,
      avgTokens: parseFloat((totalTokensSum / iterationsCount).toFixed(2)),
      avgCostUsd: parseFloat((totalCostSum / iterationsCount).toFixed(6)),
    };
  }

  compareRuns(
    baselineReport: EvaluationReport,
    currentReport: EvaluationReport,
  ): RegressionComparisonReport {
    const regressedScenarios: Array<{
      scenarioId: string;
      category: string;
      description: string;
      baselinePassed: boolean;
      currentPassed: boolean;
      failureReason?: ScenarioFailureReason;
      violations: EvaluationViolation[];
    }> = [];

    const improvedScenarios: Array<{
      scenarioId: string;
      category: string;
      description: string;
    }> = [];

    const baselineMap = new Map<string, EvaluationResult>();
    for (const r of baselineReport.results) {
      baselineMap.set(r.scenarioId, r);
    }

    for (const curr of currentReport.results) {
      const base = baselineMap.get(curr.scenarioId);
      if (base) {
        if (base.passed && !curr.passed) {
          regressedScenarios.push({
            scenarioId: curr.scenarioId,
            category: curr.category,
            description: curr.description,
            baselinePassed: true,
            currentPassed: false,
            failureReason: curr.failureReason,
            violations: curr.violations,
          });
        } else if (!base.passed && curr.passed) {
          improvedScenarios.push({
            scenarioId: curr.scenarioId,
            category: curr.category,
            description: curr.description,
          });
        }
      }
    }

    const passRateDelta = parseFloat(
      (currentReport.passRate - baselineReport.passRate).toFixed(2),
    );
    const tokenDelta =
      currentReport.totalTokens.totalTokens -
      baselineReport.totalTokens.totalTokens;
    const costDelta = parseFloat(
      (
        currentReport.totalEstimatedCostUsd -
        baselineReport.totalEstimatedCostUsd
      ).toFixed(6),
    );

    return {
      timestamp: new Date().toISOString(),
      baselinePassRate: baselineReport.passRate,
      currentPassRate: currentReport.passRate,
      passRateDelta,
      hasRegression: regressedScenarios.length > 0 || passRateDelta < 0,
      regressedScenarios,
      improvedScenarios,
      tokenUsageDelta: {
        baselineTotalTokens: baselineReport.totalTokens.totalTokens,
        currentTotalTokens: currentReport.totalTokens.totalTokens,
        delta: tokenDelta,
      },
      costDeltaUsd: {
        baselineTotalCost: baselineReport.totalEstimatedCostUsd,
        currentTotalCost: currentReport.totalEstimatedCostUsd,
        delta: costDelta,
      },
    };
  }
}
