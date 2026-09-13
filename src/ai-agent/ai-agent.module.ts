import { Module } from '@nestjs/common';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { AgentToolRegistryService } from './application/tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from './application/authorization/agent-tool-authorization.service';
import { AgentToolArgumentValidatorService } from './application/validation/agent-tool-argument-validator.service';
import { AiConfirmationService } from './application/ai-confirmation.service';
import { AiAgentObservabilityService } from './application/observability/ai-agent-observability.service';
import { OpenAIClient } from './infrastructure/openai/openai.client';
import { MetricsModule } from '../common/metrics/metrics.module';
import { AccountModule } from '../account/account.module';
import { TransactionModule } from '../transaction/transaction.module';
import { FinancialSummaryModule } from '../financial-summary/financial-summary.module';
import { TransferModule } from '../transfer/transfer.module';
import { GetAccountsTool } from './application/tools/impl/get-accounts.tool';
import { GetTransactionsTool } from './application/tools/impl/get-transactions.tool';
import { GetFinancialSummaryTool } from './application/tools/impl/get-financial-summary.tool';
import { GetBudgetsTool } from './application/tools/impl/get-budgets.tool';
import { CreateTransactionTool } from './application/tools/impl/create-transaction.tool';
import { AiConversationRepository } from './infrastructure/repositories/ai-conversation.repository';
import { AiConversationService } from './application/ai-conversation.service';
import { AiMemoryRepository } from './infrastructure/repositories/ai-memory.repository';
import { AiMemoryPolicyService } from './application/memory/ai-memory-policy.service';
import { AiMemoryService } from './application/memory/ai-memory.service';
import { SaveMemoryTool } from './application/tools/impl/save-memory.tool';
import { UpdateTransactionTool } from './application/tools/impl/update-transaction.tool';
import { DeleteTransactionTool } from './application/tools/impl/delete-transaction.tool';
import { CreateTransferTool } from './application/tools/impl/create-transfer.tool';

@Module({
  imports: [
    MetricsModule,
    AccountModule,
    TransactionModule,
    FinancialSummaryModule,
    BudgetModule,
    TransferModule,
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
    AiConversationRepository,
    AiConversationService,
    AiMemoryRepository,
    AiMemoryPolicyService,
    AiMemoryService,
    OpenAIClient,
    GetAccountsTool,
    GetTransactionsTool,
    GetFinancialSummaryTool,
    GetBudgetsTool,
    CreateTransactionTool,
    SaveMemoryTool,
    UpdateTransactionTool,
    DeleteTransactionTool,
    CreateTransferTool,
  ],
  exports: [
    AiAgentService,
    AiConfirmationService,
    AiAgentObservabilityService,
    AiConversationService,
    AiMemoryService,
  ],
})
export class AiAgentModule {}
