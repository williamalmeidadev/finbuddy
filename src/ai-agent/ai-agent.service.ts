import { Injectable, Logger } from '@nestjs/common';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { AgentResponse } from './domain/agent-response';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly orchestrator: AiAgentOrchestratorService,
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
}
