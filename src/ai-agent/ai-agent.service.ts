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

export interface ConfirmationExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface RequestCorrelationOptions {
  requestId?: string;
  aiRequestId?: string;
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
  ) {}

  async sendMessage(
    userId: string,
    message: string,
    options?: RequestCorrelationOptions,
  ): Promise<AgentResponse> {
    return this.orchestrator.processUserMessage(userId, message, options);
  }

  async processMessage(
    userId: string,
    message: string,
    options?: RequestCorrelationOptions,
  ): Promise<AgentResponse> {
    return this.sendMessage(userId, message, options);
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
