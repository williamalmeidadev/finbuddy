import { Injectable, Logger } from '@nestjs/common';
import { AgentTool } from '../tools/agent-tool.interface';
import { AgentToolPolicy } from './agent-tool-policy';

export interface AuthorizationDecision {
  authorized: boolean;
  reason?: string;
}

@Injectable()
export class AgentToolAuthorizationService {
  private readonly logger = new Logger(AgentToolAuthorizationService.name);

  authorize(userId: string, tool: AgentTool): AuthorizationDecision {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      this.logger.warn('Authorization denied: invalid authentication userId');
      return { authorized: false, reason: 'Invalid authentication context' };
    }

    if (!tool || !tool.capability) {
      this.logger.warn(
        `Authorization denied: tool ${tool?.name ?? 'unknown'} missing capability`,
      );
      return {
        authorized: false,
        reason: 'Tool missing capability declaration',
      };
    }

    const isAllowed = AgentToolPolicy.isCapabilityAllowed(tool.capability);
    if (!isAllowed) {
      this.logger.warn(
        `Authorization denied: user=${userId}, tool=${tool.name}, capability=${tool.capability}`,
      );
      return {
        authorized: false,
        reason: `Capability ${tool.capability} is not authorized`,
      };
    }

    return { authorized: true };
  }
}
