import { Injectable } from '@nestjs/common';
import { AccountService } from '../../../../account/account.service';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
} from '../agent-tool.interface';

@Injectable()
export class GetAccountsTool implements AgentTool {
  readonly name = 'get_accounts';
  readonly description =
    "Retrieve the authenticated user's financial accounts and current balances.";
  readonly inputSchema = {
    type: 'object',
    properties: {},
    required: [],
    additionalProperties: false,
  };

  constructor(private readonly accountService: AccountService) {}

  async execute(context: AgentToolContext): Promise<AgentToolResult> {
    try {
      const accounts = await this.accountService.findByUserId(context.userId);
      const sanitized = accounts.map((acc) => ({
        id: acc.id,
        name: acc.name,
        type: acc.type,
        balance: acc.balance,
        currency: acc.currency,
        color: acc.color,
        isActive: acc.isActive,
      }));
      return { success: true, data: sanitized };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to retrieve accounts',
      };
    }
  }
}
