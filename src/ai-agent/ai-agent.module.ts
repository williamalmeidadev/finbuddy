import { Module } from '@nestjs/common';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { AgentToolRegistryService } from './application/tools/agent-tool-registry.service';
import { OpenAIClient } from './infrastructure/openai/openai.client';
import { MetricsModule } from '../common/metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    AiAgentOrchestratorService,
    AgentToolRegistryService,
    OpenAIClient,
  ],
  exports: [AiAgentService],
})
export class AiAgentModule {}
