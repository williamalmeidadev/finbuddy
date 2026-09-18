import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { OpenAIClient } from '../infrastructure/openai/openai.client';
import { OpenAIResponseOutput } from '../infrastructure/openai/openai.types';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from './authorization/agent-tool-authorization.service';
import { AgentToolArgumentValidatorService } from './validation/agent-tool-argument-validator.service';
import { AiConfirmationService } from './ai-confirmation.service';
import { getFinbuddyAgentInstructions } from './prompts/finbuddy-agent.instructions';
import { AgentResponse } from '../domain/agent-response';
import {
  AgentToolContext,
  AgentToolResult,
} from './tools/agent-tool.interface';
import { MetricsService } from '../../common/metrics/metrics.service';
import { AiAgentObservabilityService } from './observability/ai-agent-observability.service';
import {
  AiErrorCode,
  AiEventName,
} from './observability/ai-agent-observability.types';

import { AccountService } from '../../account/account.service';
import { CategoryService } from '../../category/category.service';
import { TransactionService } from '../../transaction/transaction.service';
import { TransferService } from '../../transfer/transfer.service';

export interface ProcessUserMessageOptions {
  requestId?: string;
  aiRequestId?: string;
  history?: Array<{ role: 'USER' | 'ASSISTANT'; content: string }>;
  memoryContext?: string;
}

@Injectable()
export class AiAgentOrchestratorService {
  private readonly logger = new Logger(AiAgentOrchestratorService.name);

  constructor(
    private readonly openAiClient: OpenAIClient,
    private readonly toolRegistry: AgentToolRegistryService,
    private readonly authorizationService: AgentToolAuthorizationService,
    private readonly argumentValidator: AgentToolArgumentValidatorService,
    private readonly confirmationService: AiConfirmationService,
    private readonly metricsService: MetricsService,
    private readonly observability: AiAgentObservabilityService,
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly categoryService: CategoryService,
    private readonly transactionService: TransactionService,
    private readonly transferService: TransferService,
  ) {}

  async processUserMessage(
    userId: string,
    userMessage: string,
    options?: ProcessUserMessageOptions,
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const requestId = options?.requestId || 'N/A';
    const aiRequestId = options?.aiRequestId || `ai-req-${randomUUID()}`;

    await this.observability.recordEvent({
      event: AiEventName.REQUEST_STARTED,
      requestId,
      aiRequestId,
      userId,
      success: true,
    });

    const tools = this.toolRegistry.getToolDefinitions();
    const context: AgentToolContext = {
      userId,
      requestId,
      aiRequestId,
      currentDateIso: new Date().toISOString(),
    };

    const maxToolIterations =
      this.configService.get<number>('OPENAI_MAX_TOOL_ITERATIONS') ?? 5;
    const maxModelCalls =
      this.configService.get<number>('OPENAI_MAX_MODEL_CALLS') ?? 10;

    let iterations = 0;
    let modelCalls = 0;
    let totalToolCalls = 0;
    let currentInput: string | any[] = userMessage;

    const historyItems = options?.history
      ? options.history.map((h) => ({
          role: h.role.toLowerCase(),
          content: h.content,
        }))
      : [];

    if (options?.memoryContext || historyItems.length > 0) {
      const items: any[] = [];
      if (options?.memoryContext) {
        const sanitizedMemoryContext = options.memoryContext.replace(
          /<\/?user_memory[^>]*>/gi,
          '',
        );
        items.push({
          role: 'user',
          content: `<user_memory_untrusted>\n${sanitizedMemoryContext}\n</user_memory_untrusted>`,
        });
      }
      if (historyItems.length > 0) {
        items.push(...historyItems);
      }
      items.push({ role: 'user', content: userMessage });
      currentInput = items;
    }
    let previousResponseId: string | undefined = undefined;

    while (iterations < maxToolIterations) {
      if (modelCalls >= maxModelCalls) {
        const totalDurationMs = Date.now() - startTime;
        this.logger.error(
          `Maximum model calls (${maxModelCalls}) reached for request`,
        );

        await this.observability.recordEvent({
          event: AiEventName.REQUEST_FAILED,
          requestId,
          aiRequestId,
          userId,
          durationMs: totalDurationMs,
          success: false,
          errorCode: AiErrorCode.TIMEOUT,
        });

        throw new ServiceUnavailableException(
          'AI agent exceeded maximum allowed model calls',
        );
      }

      iterations++;
      modelCalls++;
      this.metricsService.increment('ai_tool_iterations');
      const llmStart = Date.now();

      await this.observability.recordEvent({
        event: AiEventName.LLM_STARTED,
        requestId,
        aiRequestId,
        userId,
      });

      let response: OpenAIResponseOutput;
      try {
        response = await this.openAiClient.createRawResponse({
          instructions: getFinbuddyAgentInstructions(context.currentDateIso ?? new Date().toISOString()),
          input: currentInput,
          tools: tools.length > 0 ? tools : undefined,
          previousResponseId,
        });

        await this.observability.recordEvent({
          event: AiEventName.LLM_COMPLETED,
          requestId,
          aiRequestId,
          userId,
          durationMs: Date.now() - llmStart,
          success: true,
        });
      } catch (err) {
        await this.observability.recordEvent({
          event: AiEventName.LLM_FAILED,
          requestId,
          aiRequestId,
          userId,
          durationMs: Date.now() - llmStart,
          success: false,
          errorCode: AiErrorCode.LLM_ERROR,
        });
        throw err;
      }

      if (response.functionCalls.length === 0) {
        const totalDurationMs = Date.now() - startTime;
        this.logger.log(
          `AI request completed: iterations=${iterations}, totalToolCalls=${totalToolCalls}, durationMs=${totalDurationMs}`,
        );

        await this.observability.recordEvent({
          event: AiEventName.REQUEST_COMPLETED,
          requestId,
          aiRequestId,
          userId,
          durationMs: totalDurationMs,
          success: true,
        });

        return new AgentResponse(response.outputText);
      }

      previousResponseId = response.id;
      const toolOutputs: Array<Record<string, unknown>> = [];
      const pendingConfirmations: AgentConfirmationDetail[] = [];

      for (const call of response.functionCalls) {
        this.metricsService.increment('ai_tool_calls_total');
        totalToolCalls++;
        const toolStart = Date.now();
        const tool = this.toolRegistry.getTool(call.name);

        await this.observability.recordEvent({
          event: AiEventName.TOOL_REQUESTED,
          requestId,
          aiRequestId,
          userId,
          toolName: call.name,
        });

        let result: AgentToolResult;

        if (!tool) {
          this.logger.warn(`Unknown tool requested by model: ${call.name}`);
          result = {
            success: false,
            error: `Unknown tool: ${call.name}`,
          };

          await this.observability.recordEvent({
            event: AiEventName.TOOL_FAILED,
            requestId,
            aiRequestId,
            userId,
            toolName: call.name,
            durationMs: Date.now() - toolStart,
            success: false,
            errorCode: AiErrorCode.TOOL_NOT_FOUND,
          });
        } else {
          // 1. Tool Argument Validation
          const validationResult = await this.argumentValidator.validate(
            call.name,
            call.arguments,
          );

          if (!validationResult.valid) {
            this.logger.warn(
              `Tool argument validation failed: tool=${call.name}, errors=${validationResult.errors.join('; ')}`,
            );
            result = {
              success: false,
              error: `Invalid tool arguments: ${validationResult.errors.join('; ')}`,
            };

            await this.observability.recordEvent({
              event: AiEventName.TOOL_VALIDATION_FAILED,
              requestId,
              aiRequestId,
              userId,
              toolName: call.name,
              durationMs: Date.now() - toolStart,
              success: false,
              errorCode: AiErrorCode.VALIDATION_ERROR,
              meta: {
                argumentValidation: 'failed',
                argumentCount: Object.keys(call.arguments || {}).length,
                argumentKeys: Object.keys(call.arguments || {}),
              },
            });
          } else {
            // 2. Formal Tool Authorization Check
            const authDecision = this.authorizationService.authorize(
              context.userId,
              tool,
            );

            if (!authDecision.authorized) {
              this.logger.warn(
                `Tool execution denied by policy: tool=${call.name}, userId=${context.userId}, reason=${authDecision.reason}`,
              );
              result = {
                success: false,
                error: `Unauthorized tool execution: ${authDecision.reason}`,
              };

              await this.observability.recordEvent({
                event: AiEventName.TOOL_AUTHORIZATION_DENIED,
                requestId,
                aiRequestId,
                userId,
                toolName: call.name,
                durationMs: Date.now() - toolStart,
                success: false,
                errorCode: AiErrorCode.AUTHORIZATION_ERROR,
                meta: {
                  reasonCode: authDecision.reason,
                },
              });
            } else if (
              !tool.readOnly &&
              (tool.requiresConfirmation ?? tool.name === 'create_transaction')
            ) {
              // 3. Write tool detected: create confirmation record
              this.metricsService.increment('ai_confirmation_total');
              const enrichedAction = await this.enrichConfirmationAction(
                context.userId,
                validationResult.value as Record<string, any>,
              );
              const confirmation =
                await this.confirmationService.createConfirmation(
                  context.userId,
                  tool.name,
                  enrichedAction,
                  { requestId, aiRequestId },
                );

              pendingConfirmations.push({
                confirmationId: confirmation.id,
                toolName: tool.name,
                action: enrichedAction,
                expiresAt: confirmation.expiresAt.toISOString(),
              });

              result = {
                success: true,
                data: {
                  status: 'confirmation_required',
                  confirmationId: confirmation.id,
                  toolName: tool.name,
                },
              };
            } else {
              // 4. Read tool execution via Application Service
              await this.observability.recordEvent({
                event: AiEventName.TOOL_STARTED,
                requestId,
                aiRequestId,
                userId,
                toolName: tool.name,
              });

              try {
                result = await tool.execute(context, validationResult.value);
                const toolDurationMs = Date.now() - toolStart;

                if (result.success) {
                  await this.observability.recordEvent({
                    event: AiEventName.TOOL_COMPLETED,
                    requestId,
                    aiRequestId,
                    userId,
                    toolName: tool.name,
                    durationMs: toolDurationMs,
                    success: true,
                  });
                } else {
                  await this.observability.recordEvent({
                    event: AiEventName.TOOL_FAILED,
                    requestId,
                    aiRequestId,
                    userId,
                    toolName: tool.name,
                    durationMs: toolDurationMs,
                    success: false,
                    errorCode: AiErrorCode.TOOL_EXECUTION_ERROR,
                  });
                }
              } catch (err) {
                const toolDurationMs = Date.now() - toolStart;
                this.logger.error(
                  `Tool execution failed: tool=${call.name}`,
                  err instanceof Error ? err.stack : String(err),
                );

                await this.observability.recordEvent({
                  event: AiEventName.TOOL_FAILED,
                  requestId,
                  aiRequestId,
                  userId,
                  toolName: call.name,
                  durationMs: toolDurationMs,
                  success: false,
                  errorCode: AiErrorCode.TOOL_EXECUTION_ERROR,
                });

                result = {
                  success: false,
                  error: 'Failed to execute financial tool',
                };
              }
            }
          }
        }

        toolOutputs.push({
          type: 'function_call_output',
          call_id: call.callId,
          output: JSON.stringify(result),
        });
      }

      if (pendingConfirmations.length > 0) {
        const totalDurationMs = Date.now() - startTime;
        const count = pendingConfirmations.length;
        this.logger.log(
          `Financial write(s) proposed, awaiting user confirmation: count=${count}, durationMs=${totalDurationMs}`,
        );

        await this.observability.recordEvent({
          event: AiEventName.REQUEST_COMPLETED,
          requestId,
          aiRequestId,
          userId,
          durationMs: totalDurationMs,
          success: true,
        });

        const messageText =
          count === 1
            ? 'Esta operação financeira requer a sua confirmação. Por favor, confira os detalhes abaixo para autorizar ou cancelar.'
            : `Foram solicitadas ${count} operações financeiras que requerem a sua confirmação. Por favor, confira os detalhes abaixo para autorizá-las ou cancelá-las.`;

        return new AgentResponse(
          messageText,
          'confirmation_required',
          pendingConfirmations[0],
          undefined,
          pendingConfirmations,
        );
      }

      currentInput = toolOutputs;
    }

    const totalDurationMs = Date.now() - startTime;
    this.logger.error(
      `Maximum tool iterations (${maxToolIterations}) reached for request`,
    );

    await this.observability.recordEvent({
      event: AiEventName.REQUEST_FAILED,
      requestId,
      aiRequestId,
      userId,
      durationMs: totalDurationMs,
      success: false,
      errorCode: AiErrorCode.TIMEOUT,
    });

    throw new ServiceUnavailableException(
      'AI agent exceeded maximum allowed tool steps',
    );
  }

  private async enrichConfirmationAction(
    userId: string,
    argumentsObj: Record<string, any>,
  ): Promise<Record<string, any>> {
    const enriched = { ...argumentsObj };

    try {
      if (enriched.transactionId) {
        const tx = await this.transactionService
          .findById(enriched.transactionId, userId)
          .catch(() => null);
        if (tx) {
          if (enriched.description === undefined && tx.description) {
            enriched.description = tx.description;
          }
          if (enriched.amount === undefined && tx.amount !== undefined) {
            enriched.amount = tx.amount;
          }
          if (enriched.type === undefined && tx.type) {
            enriched.type = tx.type;
          }
          if (enriched.transactionAt === undefined && tx.transactionAt) {
            enriched.transactionAt = tx.transactionAt;
          }
          if (!enriched.accountId && tx.accountId) {
            enriched.accountId = tx.accountId;
          }
          if (!enriched.categoryId && tx.categoryId) {
            enriched.categoryId = tx.categoryId;
          }
        }
      }

      if (enriched.transferId) {
        const transfers = await this.transferService
          .findByUserId(userId)
          .catch(() => []);
        const tr = transfers.find((t) => t.id === enriched.transferId);
        if (tr) {
          if (enriched.amount === undefined && tr.amount !== undefined) {
            enriched.amount = tr.amount;
          }
          if (enriched.transactionAt === undefined && tr.transactionAt) {
            enriched.transactionAt = tr.transactionAt;
          }
          if (!enriched.fromAccountId && tr.fromAccountId) {
            enriched.fromAccountId = tr.fromAccountId;
          }
          if (!enriched.toAccountId && tr.toAccountId) {
            enriched.toAccountId = tr.toAccountId;
          }
        }
      }

      const needAccounts =
        enriched.accountId || enriched.fromAccountId || enriched.toAccountId;
      const needCategories = enriched.categoryId;

      const [accounts, categories] = await Promise.all([
        needAccounts
          ? this.accountService.findByUserId(userId).catch(() => [])
          : Promise.resolve([]),
        needCategories
          ? this.categoryService.findByUserId(userId).catch(() => [])
          : Promise.resolve([]),
      ]);

      if (enriched.accountId && !enriched.accountName) {
        const acc = accounts.find((a) => a.id === enriched.accountId);
        if (acc) enriched.accountName = acc.name;
      }
      if (enriched.fromAccountId && !enriched.fromAccountName) {
        const acc = accounts.find((a) => a.id === enriched.fromAccountId);
        if (acc) enriched.fromAccountName = acc.name;
      }
      if (enriched.toAccountId && !enriched.toAccountName) {
        const acc = accounts.find((a) => a.id === enriched.toAccountId);
        if (acc) enriched.toAccountName = acc.name;
      }
      if (enriched.categoryId && !enriched.categoryName) {
        const cat = categories.find((c) => c.id === enriched.categoryId);
        if (cat) enriched.categoryName = cat.name;
      }
    } catch {
      // Fall back gracefully to original args
    }

    return enriched;
  }
}
