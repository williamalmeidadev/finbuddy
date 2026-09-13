import { Module } from '@nestjs/common';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { AgentToolRegistryService } from './application/tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from './application/authorization/agent-tool-authorization.service';
import { AgentToolArgumentValidatorService } from './application/validation/agent-tool-argument-validator.service';
import { AiConfirmationService } from './application/ai-confirmation.service';
import { OpenAIClient } from './infrastructure/openai/openai.client';
import { MetricsModule } from '../common/metrics/metrics.module';
import { AccountModule } from '../account/account.module';
import { TransactionModule } from '../transaction/transaction.module';
import { FinancialSummaryModule } from '../financial-summary/financial-summary.module';
import { BudgetModule } from '../budget/budget.module';
import { GetAccountsTool } from './application/tools/impl/get-accounts.tool';
import { GetTransactionsTool } from './application/tools/impl/get-transactions.tool';
import { GetFinancialSummaryTool } from './application/tools/impl/get-financial-summary.tool';
import { GetBudgetsTool } from './application/tools/impl/get-budgets.tool';
import { CreateTransactionTool } from './application/tools/impl/create-transaction.tool';
import { AiAgentObservabilityService } from './application/observability/ai-agent-observability.service';

@Module({
  imports: [
    MetricsModule,
    AccountModule,
    TransactionModule,
    FinancialSummaryModule,
    BudgetModule,
  ],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    AiAgentOrchestratorService,
    AgentToolRegistryService,
    AgentToolAuthorizationService,
    AgentToolArgumentValidatorService,
    AiConfirmationService,
    AiAgentObservabilityService,
    OpenAIClient,
    GetAccountsTool,
    GetTransactionsTool,
    GetFinancialSummaryTool,
    GetBudgetsTool,
    CreateTransactionTool,
  ],
  exports: [AiAgentService, AiConfirmationService, AiAgentObservabilityService],
})
export class AiAgentModule {}
