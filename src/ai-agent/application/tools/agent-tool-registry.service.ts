import { Injectable, OnModuleInit } from '@nestjs/common';
import { AgentTool } from './agent-tool.interface';
import { GetAccountsTool } from './impl/get-accounts.tool';
import { GetTransactionsTool } from './impl/get-transactions.tool';
import { GetFinancialSummaryTool } from './impl/get-financial-summary.tool';
import { GetBudgetsTool } from './impl/get-budgets.tool';
import { CreateTransactionTool } from './impl/create-transaction.tool';
import { SaveMemoryTool } from './impl/save-memory.tool';
import { UpdateTransactionTool } from './impl/update-transaction.tool';
import { DeleteTransactionTool } from './impl/delete-transaction.tool';
import { CreateTransferTool } from './impl/create-transfer.tool';
import { UpdateTransferTool } from './impl/update-transfer.tool';

@Injectable()
export class AgentToolRegistryService implements OnModuleInit {
  private readonly tools = new Map<string, AgentTool>();

  constructor(
    private readonly getAccountsTool: GetAccountsTool,
    private readonly getTransactionsTool: GetTransactionsTool,
    private readonly getFinancialSummaryTool: GetFinancialSummaryTool,
    private readonly getBudgetsTool: GetBudgetsTool,
    private readonly createTransactionTool: CreateTransactionTool,
    private readonly saveMemoryTool: SaveMemoryTool,
    private readonly updateTransactionTool: UpdateTransactionTool,
    private readonly deleteTransactionTool: DeleteTransactionTool,
    private readonly createTransferTool: CreateTransferTool,
    private readonly updateTransferTool: UpdateTransferTool,
  ) {}

  onModuleInit() {
    this.registerTool(this.getAccountsTool);
    this.registerTool(this.getTransactionsTool);
    this.registerTool(this.getFinancialSummaryTool);
    this.registerTool(this.getBudgetsTool);
    this.registerTool(this.createTransactionTool);
    this.registerTool(this.saveMemoryTool);
    this.registerTool(this.updateTransactionTool);
    this.registerTool(this.deleteTransactionTool);
    this.registerTool(this.createTransferTool);
    this.registerTool(this.updateTransferTool);
  }

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  getTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): any[] {
    return this.getTools().map((t) => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.inputSchema || t.parameters,
    }));
  }
}
