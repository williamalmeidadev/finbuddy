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

export interface ConfirmationExecutionResult {
  success: boolean;
  message: string;
  data?: unknown;
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
  ) {}

  async sendMessage(userId: string, message: string): Promise<AgentResponse> {
    const startTime = Date.now();
    this.metricsService.increment('ai_agent_requests_total');

    try {
      const response = await this.orchestrator.processUserMessage(
        userId,
        message,
      );
      const durationMs = Date.now() - startTime;
      this.metricsService.increment('ai_agent_requests_success_total');
      this.logger.log(
        `[user:${userId}] AI Agent message processed in ${durationMs}ms`,
      );
      return response;
    } catch (error) {
      this.metricsService.increment('ai_agent_requests_failure_total');
      throw error;
    }
  }

  async processMessage(
    userId: string,
    message: string,
  ): Promise<AgentResponse> {
    return this.sendMessage(userId, message);
  }

  async confirmAction(
    userId: string,
    confirmationId: string,
  ): Promise<ConfirmationExecutionResult> {
    this.logger.log(
      `Executing confirmation action: id=${confirmationId}, user=${userId}`,
    );

    // 1. Atomically consume pending confirmation (validates ownership, expiration, status, replay)
    const confirmation = await this.confirmationService.consumeConfirmation(
      confirmationId,
      userId,
    );

    // 2. Look up registered tool
    const tool = this.toolRegistry.getTool(confirmation.toolName);
    if (!tool) {
      this.logger.error(
        `Tool not found for confirmation: toolName=${confirmation.toolName}`,
      );
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
      throw new ForbiddenException(
        `Tool execution unauthorized: ${authDecision.reason}`,
      );
    }

    // 4. Direct application execution without LLM
    try {
      const result = await tool.execute({ userId }, confirmation.argumentsJson);

      if (!result.success) {
        this.logger.warn(
          `Confirmation action execution failed in domain service: ${result.error}`,
        );
        throw new BadRequestException(
          result.error ?? 'Execution of financial action failed',
        );
      }

      this.logger.log(
        `Confirmation action executed successfully: id=${confirmationId}, tool=${tool.name}, user=${userId}`,
      );
      this.metricsService.increment('ai_confirmation_executions_success_total');

      return {
        success: true,
        message: 'Financial action executed successfully',
        data: result.data as Record<string, unknown>,
      };
    } catch (error) {
      this.metricsService.increment('ai_confirmation_executions_failure_total');
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
  ): Promise<{ success: boolean; message: string }> {
    await this.confirmationService.cancelConfirmation(confirmationId, userId);
    this.metricsService.increment('ai_confirmations_cancelled_total');
    return {
      success: true,
      message: 'Confirmation request cancelled',
    };
  }
}
