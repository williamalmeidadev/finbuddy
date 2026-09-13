import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
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
import { ConversationMessageRole } from '../generated/prisma/enums';

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

  constructor(
    private readonly orchestrator: AiAgentOrchestratorService,
    private readonly confirmationService: AiConfirmationService,
    private readonly toolRegistry: AgentToolRegistryService,
    private readonly authorizationService: AgentToolAuthorizationService,
    private readonly metricsService: MetricsService,
    private readonly observability: AiAgentObservabilityService,
    private readonly conversationService: AiConversationService,
  ) {}

  async sendMessage(
    userId: string,
    message: string,
    options?: RequestCorrelationOptions,
  ): Promise<AgentResponse> {
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

    // Persist user message
    await this.conversationService.appendMessage(
      conversationId,
      userId,
      ConversationMessageRole.USER,
      message,
      options,
    );

    // Run orchestrator loop with historical context
    const response = await this.orchestrator.processUserMessage(
      userId,
      message,
      {
        ...options,
        history,
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
}
