import { AgentCapability } from './agent-capability.enum';

export class AgentToolPolicy {
  private static readonly AUTHORIZED_CAPABILITIES = new Set<AgentCapability>([
    AgentCapability.READ_ACCOUNTS,
    AgentCapability.READ_TRANSACTIONS,
    AgentCapability.READ_FINANCIAL_SUMMARY,
    AgentCapability.READ_BUDGETS,
    AgentCapability.CREATE_TRANSACTION,
    AgentCapability.UPDATE_TRANSACTION,
    AgentCapability.DELETE_TRANSACTION,
    AgentCapability.CREATE_TRANSFER,
    AgentCapability.MANAGE_MEMORY,
  ]);

  static isCapabilityAllowed(capability: AgentCapability): boolean {
    if (!capability || !Object.values(AgentCapability).includes(capability)) {
      return false;
    }
    return this.AUTHORIZED_CAPABILITIES.has(capability);
  }
}
