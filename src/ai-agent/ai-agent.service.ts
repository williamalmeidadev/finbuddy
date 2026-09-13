import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import { ConversationMessageRole } from '../generated/prisma/enums';
import {
  CreateMemoryDto,
  ListMemoriesQueryDto,
  UpdateMemoryDto,
} from './dto/memory.dtos';

import { ConfigService } from '@nestjs/config';

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
    private readonly configService: ConfigService,
  ) {}

  async sendMessage(
    userId: string,
    message: string,
    options?: RequestCorrelationOptions,
  ): Promise<AgentResponse> {
    // 0. Input size check
    const maxInputChars =
      this.configService.get<number>('AI_MAX_INPUT_CHARS') ?? 2000;
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
        content: h.content,
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

      // 3. Load user memories for context injection & memory context budget check
      const userMemories = await this.memoryService.getUserMemories(
        userId,
        undefined,
        options,
      );
      let memoryContext =
        this.memoryService.formatMemoriesForModelContext(userMemories);

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

      // Persist assistant message
      await this.conversationService.appendMessage(
        conversationId,
        userId,
        ConversationMessageRole.ASSISTANT,
        response.message,
        options,
      );

      return new AgentResponse(
        response.message,
        response.type,
        response.confirmation,
        conversationId,
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
    return this.conversationService.getConversationMessages(
      id,
      userId,
      page,
      limit,
    );
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
