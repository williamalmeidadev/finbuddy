import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  MessageEvent,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { AiConfirmationService } from './application/ai-confirmation.service';
import { AgentToolRegistryService } from './application/tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from './application/authorization/agent-tool-authorization.service';
import { AgentResponse } from './domain/agent-response';
import { MetricsService } from '../common/metrics/metrics.service';
import { AiAgentObservabilityService } from './application/observability/ai-agent-observability.service';
import {
  AiErrorCode,
  AiEventName,
} from './application/observability/ai-agent-observability.types';

import { AiConversationService } from './application/ai-conversation.service';
import { AiMemoryService } from './application/memory/ai-memory.service';
import {
  ConversationMessageRole,
  AiConfirmationStatus,
} from '../generated/prisma/enums';
import { DatabaseService } from '../database/database.service';
import {
  CreateMemoryDto,
  ListMemoriesQueryDto,
  UpdateMemoryDto,
} from './dto/memory.dtos';

import { ConfigService } from '@nestjs/config';

import { AgentDomainGuardrailService } from './application/guardrails/agent-domain-guardrail.service';

export interface ConfirmationExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface RequestCorrelationOptions {
  requestId?: string;
  aiRequestId?: string;
  conversationId?: string;
}

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private readonly activeUserRequests = new Map<string, number>();

  constructor(
    private readonly orchestrator: AiAgentOrchestratorService,
    private readonly confirmationService: AiConfirmationService,
    private readonly toolRegistry: AgentToolRegistryService,
    private readonly authorizationService: AgentToolAuthorizationService,
    private readonly metricsService: MetricsService,
    private readonly observability: AiAgentObservabilityService,
    private readonly conversationService: AiConversationService,
    private readonly memoryService: AiMemoryService,
    private readonly domainGuardrail: AgentDomainGuardrailService,
    private readonly configService: ConfigService,
    private readonly prisma: DatabaseService,
  ) {}

  async sendMessage(
    userId: string,
    message: string,
    options?: RequestCorrelationOptions,
  ): Promise<AgentResponse> {
    // 0. Input domain guardrail pre-execution check
    const guardrailResult = this.domainGuardrail.validateInput(message);
    if (!guardrailResult.allowed) {
      this.metricsService.increment('ai_guardrail_blocked_total');
      this.logger.warn(
        `Guardrail intercepted disallowed message: reason=${guardrailResult.reason}`,
      );

      await this.observability.recordEvent({
        event: AiEventName.GUARDRAIL_BLOCKED,
        requestId: options?.requestId || 'N/A',
        aiRequestId: options?.aiRequestId,
        userId,
        success: false,
        errorCode: AiErrorCode.GUARDRAIL_BLOCKED,
        meta: { reason: guardrailResult.reason },
      });

      let conversationId: string;
      if (options?.conversationId) {
        await this.conversationService.getConversation(
          options.conversationId,
          userId,
        );
        conversationId = options.conversationId;
      } else {
        const titleSnippet =
          message.length > 50 ? `${message.slice(0, 47)}...` : message;
        const newConv = await this.conversationService.createConversation(
          userId,
          titleSnippet,
          options,
        );
        conversationId = newConv.id;
      }

      const refusalText =
        guardrailResult.refusalMessage ||
        'Sou o FinBuddy, assistente focado exclusivamente em finanças pessoais.';

      await this.conversationService.appendMessage(
        conversationId,
        userId,
        ConversationMessageRole.USER,
        message,
        options,
      );

      await this.conversationService.appendMessage(
        conversationId,
        userId,
        ConversationMessageRole.ASSISTANT,
        refusalText,
        options,
      );

      return new AgentResponse(refusalText, 'response', undefined, conversationId);
    }

    // 0.1 Input size check
    const maxInputChars =
      this.configService.get<number>('AI_MAX_INPUT_CHARS') ?? 500;
    if (message && message.length > maxInputChars) {
      this.metricsService.increment('ai_requests_failed_total');
      throw new BadRequestException(
        `User message exceeds maximum allowed length of ${maxInputChars} characters`,
      );
    }

    // 1. Per-user concurrency limit check
    const maxConcurrent =
      this.configService.get<number>('AI_MAX_CONCURRENT_REQUESTS_PER_USER') ??
      3;
    const currentActive = this.activeUserRequests.get(userId) || 0;
    if (currentActive >= maxConcurrent) {
      this.metricsService.increment('ai_rate_limited_total');
      this.metricsService.increment('ai_requests_failed_total');
      throw new ServiceUnavailableException(
        `Too many concurrent AI requests from user (max ${maxConcurrent})`,
      );
    }

    this.activeUserRequests.set(userId, currentActive + 1);
    this.metricsService.increment('ai_requests_total');

    try {
      let conversationId: string;

      if (options?.conversationId) {
        // Validate ownership & existence (throws NotFoundException if invalid/unauthorized)
        await this.conversationService.getConversation(
          options.conversationId,
          userId,
        );
        conversationId = options.conversationId;
      } else {
        // Auto-create a conversation if none specified
        const titleSnippet =
          message.length > 50 ? `${message.slice(0, 47)}...` : message;
        const newConv = await this.conversationService.createConversation(
          userId,
          titleSnippet,
          options,
        );
        conversationId = newConv.id;
      }

      // Load bounded history (max 20 messages)
      const rawHistory = await this.conversationService.getRecentHistory(
        conversationId,
        userId,
        20,
        options,
      );

      const history = rawHistory.map((h) => ({
        role: h.role,
        content: h.content.replace(/<!--CONFIRMATION:[\s\S]*?-->/g, '').trim(),
      }));

      // 2. Conversation context budget enforcement
      const maxContextChars =
        this.configService.get<number>('AI_MAX_CONTEXT_CHARS') ?? 15000;
      let totalChars =
        history.reduce((sum, h) => sum + h.content.length, 0) + message.length;
      while (totalChars > maxContextChars && history.length > 1) {
        history.shift();
        totalChars =
          history.reduce((sum, h) => sum + h.content.length, 0) +
          message.length;
      }

      // 3. Auto-extract explicit user preferences & load relevant memories
      await this.memoryService
        .autoExtractAndSavePreferences(userId, message)
        .catch(() => []);

      const userMemories = await this.memoryService.getUserMemories(
        userId,
        undefined,
        options,
      );
      const relevantMemories = this.memoryService.filterRelevantMemories(
        userMemories,
        message,
      );
      let memoryContext =
        this.memoryService.formatMemoriesForModelContext(relevantMemories);

      const maxMemoryChars =
        this.configService.get<number>('AI_MAX_MEMORY_CONTEXT_CHARS') ?? 2000;
      if (memoryContext && memoryContext.length > maxMemoryChars) {
        memoryContext =
          memoryContext.slice(0, maxMemoryChars) + '\n</user_memory>';
      }

      // Persist user message
      await this.conversationService.appendMessage(
        conversationId,
        userId,
        ConversationMessageRole.USER,
        message,
        options,
      );

      // Run orchestrator loop with historical & memory context
      const response = await this.orchestrator.processUserMessage(
        userId,
        message,
        {
          ...options,
          history,
          memoryContext: memoryContext || undefined,
        },
      );

      const assistantContent =
        response.confirmations && response.confirmations.length > 0
          ? `${response.message} <!--CONFIRMATIONS:${JSON.stringify(response.confirmations)}-->`
          : response.confirmation
            ? `${response.message} <!--CONFIRMATION:${JSON.stringify(response.confirmation)}-->`
            : response.message;

      // Persist assistant message
      await this.conversationService.appendMessage(
        conversationId,
        userId,
        ConversationMessageRole.ASSISTANT,
        assistantContent,
        options,
      );

      return new AgentResponse(
        response.message,
        response.type,
        response.confirmation,
        conversationId,
        response.confirmations,
      );
    } catch (err) {
      this.metricsService.increment('ai_requests_failed_total');
      throw err;
    } finally {
      const remaining = (this.activeUserRequests.get(userId) || 1) - 1;
      if (remaining <= 0) {
        this.activeUserRequests.delete(userId);
      } else {
        this.activeUserRequests.set(userId, remaining);
      }
    }
  }

  async processMessage(
    userId: string,
    message: string,
    options?: RequestCorrelationOptions,
  ): Promise<AgentResponse> {
    return this.sendMessage(userId, message, options);
  }

  streamMessage(
    userId: string,
    message: string,
    options?: RequestCorrelationOptions,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      void (async () => {
        try {
          subscriber.next({
            data: JSON.stringify({
              type: 'status',
              status: 'processing',
              timestamp: new Date().toISOString(),
            }),
          });

          const agentResponse = await this.sendMessage(
            userId,
            message,
            options,
          );

          if (agentResponse.type === 'confirmation_required') {
            subscriber.next({
              data: JSON.stringify({
                type: 'confirmation_required',
                confirmation: agentResponse.confirmation,
                confirmations: agentResponse.confirmations,
                conversationId: agentResponse.conversationId,
                timestamp: new Date().toISOString(),
              }),
            });
          }

          subscriber.next({
            data: JSON.stringify({
              type: 'text_chunk',
              text: agentResponse.message,
              conversationId: agentResponse.conversationId,
              timestamp: new Date().toISOString(),
            }),
          });

          subscriber.next({
            data: JSON.stringify({
              type: 'done',
              conversationId: agentResponse.conversationId,
              timestamp: new Date().toISOString(),
            }),
          });
          subscriber.complete();
        } catch (err) {
          subscriber.next({
            data: JSON.stringify({
              type: 'error',
              error: err instanceof Error ? err.message : 'Processing failed',
              timestamp: new Date().toISOString(),
            }),
          });
          subscriber.error(err);
        }
      })();
    });
  }

  async createConversation(
    userId: string,
    title?: string,
    options?: RequestCorrelationOptions,
  ) {
    return this.conversationService.createConversation(userId, title, options);
  }

  async getConversation(id: string, userId: string) {
    return this.conversationService.getConversation(id, userId);
  }

  async getUserConversations(userId: string, page?: number, limit?: number) {
    return this.conversationService.getUserConversations(userId, page, limit);
  }

  async getConversationMessages(
    id: string,
    userId: string,
    page?: number,
    limit?: number,
  ) {
    const result = await this.conversationService.getConversationMessages(
      id,
      userId,
      page,
      limit,
    );

    const items = await Promise.all(
      result.items.map(async (msg) => {
        let content = msg.content;
        let confirmation: Record<string, unknown> | undefined = undefined;
        let confirmations: Record<string, unknown>[] | undefined = undefined;

        const matchPlural = content.match(/<!--CONFIRMATIONS:([\s\S]*?)-->/);
        const matchSingular = content.match(/<!--CONFIRMATION:([\s\S]*?)-->/);

        if (matchPlural && matchPlural[1]) {
          try {
            const rawConfs = JSON.parse(matchPlural[1]) as Record<
              string,
              unknown
            >[];
            content = content
              .replace(/<!--CONFIRMATIONS:[\s\S]*?-->/g, '')
              .replace(/<!--CONFIRMATION:[\s\S]*?-->/g, '')
              .trim();

            confirmations = await Promise.all(
              rawConfs.map(async (rawConf) => {
                const confId =
                  typeof rawConf.confirmationId === 'string'
                    ? rawConf.confirmationId
                    : typeof rawConf.id === 'string'
                      ? rawConf.id
                      : undefined;
                let status = 'pending';

                if (confId) {
                  const dbConf = await this.prisma.aiConfirmation.findUnique({
                    where: { id: confId },
                  });
                  if (dbConf) {
                    if (dbConf.status === AiConfirmationStatus.CONSUMED) {
                      status = 'confirmed';
                    } else if (
                      dbConf.status === AiConfirmationStatus.CANCELLED
                    ) {
                      status = 'cancelled';
                    } else if (
                      dbConf.status === AiConfirmationStatus.EXPIRED ||
                      dbConf.expiresAt <= new Date()
                    ) {
                      status = 'expired';
                    } else {
                      status = 'pending';
                    }
                  } else {
                    status = 'cancelled';
                  }
                }

                return {
                  ...rawConf,
                  status,
                };
              }),
            );

            if (confirmations.length > 0) {
              confirmation = confirmations[0];
            }
          } catch {
            // Ignore JSON parse errors
          }
        } else if (matchSingular && matchSingular[1]) {
          try {
            const rawConf = JSON.parse(matchSingular[1]) as Record<
              string,
              unknown
            >;
            content = content
              .replace(/<!--CONFIRMATION:[\s\S]*?-->/g, '')
              .trim();
            const confId =
              typeof rawConf.confirmationId === 'string'
                ? rawConf.confirmationId
                : typeof rawConf.id === 'string'
                  ? rawConf.id
                  : undefined;
            let status = 'pending';

            if (confId) {
              const dbConf = await this.prisma.aiConfirmation.findUnique({
                where: { id: confId },
              });
              if (dbConf) {
                if (dbConf.status === AiConfirmationStatus.CONSUMED) {
                  status = 'confirmed';
                } else if (dbConf.status === AiConfirmationStatus.CANCELLED) {
                  status = 'cancelled';
                } else if (
                  dbConf.status === AiConfirmationStatus.EXPIRED ||
                  dbConf.expiresAt <= new Date()
                ) {
                  status = 'expired';
                } else {
                  status = 'pending';
                }
              } else {
                status = 'cancelled';
              }
            }

            confirmation = {
              ...rawConf,
              status,
            };
            confirmations = [confirmation];
          } catch {
            // Ignore JSON parse errors
          }
        }

        return {
          ...msg,
          content,
          confirmation,
          confirmations,
        };
      }),
    );

    return {
      ...result,
      items,
    };
  }

  async deleteConversation(
    id: string,
    userId: string,
    options?: RequestCorrelationOptions,
  ) {
    return this.conversationService.deleteConversation(id, userId, options);
  }

  async confirmAction(
    userId: string,
    confirmationId: string,
    options?: RequestCorrelationOptions,
  ): Promise<ConfirmationExecutionResult> {
    const startTime = Date.now();
    const reqId = options?.requestId || 'N/A';

    this.logger.log(
      `Executing confirmation action: id=${confirmationId}, user=${userId}`,
    );

    // 1. Atomically consume pending confirmation (validates ownership, expiration, status, replay)
    const confirmation = await this.confirmationService.consumeConfirmation(
      confirmationId,
      userId,
      options,
    );

    const aiReqId = confirmation.aiRequestId || undefined;

    // 2. Look up registered tool
    const tool = this.toolRegistry.getTool(confirmation.toolName);
    if (!tool) {
      this.logger.error(
        `Tool not found for confirmation: toolName=${confirmation.toolName}`,
      );
      await this.observability.recordEvent({
        event: AiEventName.TOOL_FAILED,
        requestId: reqId,
        aiRequestId: aiReqId,
        userId,
        toolName: confirmation.toolName,
        confirmationId,
        success: false,
        errorCode: AiErrorCode.TOOL_NOT_FOUND,
      });
      throw new NotFoundException(
        `Tool '${confirmation.toolName}' is not registered`,
      );
    }

    // 3. Re-verify explicit authorization
    const authDecision = this.authorizationService.authorize(userId, tool);
    if (!authDecision.authorized) {
      this.logger.warn(
        `Authorization denied during confirmation execution: user=${userId}, tool=${tool.name}, reason=${authDecision.reason}`,
      );
      await this.observability.recordEvent({
        event: AiEventName.TOOL_AUTHORIZATION_DENIED,
        requestId: reqId,
        aiRequestId: aiReqId,
        userId,
        toolName: tool.name,
        confirmationId,
        success: false,
        errorCode: AiErrorCode.AUTHORIZATION_ERROR,
        meta: { reasonCode: authDecision.reason },
      });
      throw new ForbiddenException(
        `Tool execution unauthorized: ${authDecision.reason}`,
      );
    }

    // 4. Direct application execution without LLM
    try {
      const result = await tool.execute(
        { userId, requestId: reqId, aiRequestId: aiReqId },
        confirmation.argumentsJson,
      );

      const durationMs = Date.now() - startTime;

      if (!result.success) {
        this.logger.warn(
          `Confirmation action execution failed in domain service: ${result.error}`,
        );
        await this.observability.recordEvent({
          event: AiEventName.TOOL_FAILED,
          requestId: reqId,
          aiRequestId: aiReqId,
          userId,
          toolName: tool.name,
          confirmationId,
          durationMs,
          success: false,
          errorCode: AiErrorCode.TOOL_EXECUTION_ERROR,
        });
        throw new BadRequestException(
          result.error ?? 'Execution of financial action failed',
        );
      }

      this.logger.log(
        `Confirmation action executed successfully: id=${confirmationId}, tool=${tool.name}, user=${userId}`,
      );

      await this.observability.recordEvent({
        event: AiEventName.TOOL_COMPLETED,
        requestId: reqId,
        aiRequestId: aiReqId,
        userId,
        toolName: tool.name,
        confirmationId,
        durationMs,
        success: true,
      });

      if (options?.conversationId) {
        await this.conversationService.appendMessage(
          options.conversationId,
          userId,
          ConversationMessageRole.ASSISTANT,
          `✅ Operação financeira confirmada e executada com sucesso!`,
          options,
        );
      }

      return {
        success: true,
        message: 'Financial action executed successfully',
        data: result.data as Record<string, unknown>,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      this.logger.error(
        `Unexpected error executing confirmation action: ${error instanceof Error ? error.stack : String(error)}`,
      );
      await this.observability.recordEvent({
        event: AiEventName.TOOL_FAILED,
        requestId: reqId,
        aiRequestId: aiReqId,
        userId,
        toolName: tool.name,
        confirmationId,
        durationMs: Date.now() - startTime,
        success: false,
        errorCode: AiErrorCode.TOOL_EXECUTION_ERROR,
      });
      throw new BadRequestException(
        error instanceof Error
          ? error.message
          : 'Failed to execute confirmed action',
      );
    }
  }

  async cancelAction(
    userId: string,
    confirmationId: string,
    options?: RequestCorrelationOptions,
  ): Promise<{ success: boolean; message: string }> {
    await this.confirmationService.cancelConfirmation(
      confirmationId,
      userId,
      options,
    );

    if (options?.conversationId) {
      await this.conversationService.appendMessage(
        options.conversationId,
        userId,
        ConversationMessageRole.ASSISTANT,
        `❌ Operação financeira cancelada pelo usuário.`,
        options,
      );
    }

    return {
      success: true,
      message: 'Confirmation request cancelled',
    };
  }

  async saveMemory(
    userId: string,
    dto: CreateMemoryDto,
    options?: RequestCorrelationOptions,
  ) {
    return this.memoryService.saveMemory(
      userId,
      dto.type,
      dto.key,
      dto.value,
      options,
    );
  }

  async getUserMemories(
    userId: string,
    query?: ListMemoriesQueryDto,
    options?: RequestCorrelationOptions,
  ) {
    return this.memoryService.getUserMemories(userId, query?.type, options);
  }

  async getMemory(id: string, userId: string) {
    return this.memoryService.getMemoryById(id, userId);
  }

  async updateMemory(
    id: string,
    userId: string,
    dto: UpdateMemoryDto,
    options?: RequestCorrelationOptions,
  ) {
    return this.memoryService.updateMemoryValue(id, userId, dto.value, options);
  }

  async deleteMemory(
    id: string,
    userId: string,
    options?: RequestCorrelationOptions,
  ) {
    return this.memoryService.deleteMemory(id, userId, options);
  }

  async deleteAllMemories(userId: string, options?: RequestCorrelationOptions) {
    return this.memoryService.deleteAllMemoriesForUser(userId, options);
  }
}
