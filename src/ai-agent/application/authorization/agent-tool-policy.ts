import { AgentCapability } from './agent-capability.enum';

export class AgentToolPolicy {
  private static readonly AUTHORIZED_CAPABILITIES = new Set<AgentCapability>([
    AgentCapability.READ_ACCOUNTS,
    AgentCapability.READ_TRANSACTIONS,
    AgentCapability.READ_FINANCIAL_SUMMARY,
    AgentCapability.READ_BUDGETS,
    AgentCapability.CREATE_TRANSACTION,
  ]);

  static isCapabilityAllowed(capability: AgentCapability): boolean {
    if (!capability || !Object.values(AgentCapability).includes(capability)) {
      return false;
    }
    return this.AUTHORIZED_CAPABILITIES.has(capability);
  }
}
