export interface AgentConfirmationDetail {
  confirmationId: string;
  toolName: string;
  action: Record<string, any>;
  expiresAt: string;
}

export class AgentResponse {
  constructor(
    public readonly message: string,
    public readonly type: 'response' | 'confirmation_required' = 'response',
    public readonly confirmation?: AgentConfirmationDetail,
  ) {}
}
