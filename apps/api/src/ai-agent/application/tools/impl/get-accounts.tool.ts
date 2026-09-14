import { Injectable } from '@nestjs/common';
import { AccountService } from '../../../../account/account.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import {
  AgentTool,
  AgentToolContext,
  AgentToolResult,
  AgentToolRiskLevel,
} from '../agent-tool.interface';

@Injectable()
export class GetAccountsTool implements AgentTool {
  readonly name = 'get_accounts';
  readonly description =
    "Retrieve the authenticated user's financial accounts and current balances.";
  readonly capability = AgentCapability.READ_ACCOUNTS;
  readonly riskLevel = AgentToolRiskLevel.LOW;
  readonly readOnly = true;
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
      const sanitized = accounts.map((acc) => {
        const rawBalance = acc.balance as unknown;
        const numBalance =
          typeof rawBalance === 'number'
            ? rawBalance
            : rawBalance &&
                typeof rawBalance === 'object' &&
                'toNumber' in rawBalance &&
                typeof (rawBalance as { toNumber: () => number }).toNumber ===
                  'function'
              ? (rawBalance as { toNumber: () => number }).toNumber()
              : Number(rawBalance);
        const formattedBalance = Number(numBalance.toFixed(2));
        return {
          id: acc.id,
          name: acc.name,
          type: acc.type,
          balance: formattedBalance,
          currency: acc.currency,
          color: acc.color,
          isActive: acc.isActive,
        };
      });

      const activeAccounts = sanitized.filter((a) => a.isActive);
      const totalBalance = Number(
        activeAccounts.reduce((sum, a) => sum + a.balance, 0).toFixed(2),
      );

      return {
        success: true,
        data: {
          totalBalance,
          activeAccountsCount: activeAccounts.length,
          accounts: sanitized,
        },
      };
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
