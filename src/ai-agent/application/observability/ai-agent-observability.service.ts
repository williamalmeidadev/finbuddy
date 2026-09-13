import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { MetricsService } from '../../../common/metrics/metrics.service';
import { AiAgentEvent } from './ai-agent-observability.types';
import { Prisma } from '../../../generated/prisma/client';

const BLACKLISTED_KEY_PATTERNS = [
  /api[_-]?key/i,
  /token/i,
  /password/i,
  /secret/i,
  /authorization/i,
  /cookie/i,
  /bearer/i,
  /credit[_-]?card/i,
  /ssn/i,
  /database[_-]?url/i,
  /amount/i,
  /description/i,
  /balance/i,
];

const SENSITIVE_VALUE_PATTERNS = [
  /sk-[a-zA-Z0-9_-]+/i,
  /Bearer\s+[a-zA-Z0-9._-]+/i,
  /postgres:\/\/[^\s]+/i,
];

@Injectable()
export class AiAgentObservabilityService {
  private readonly logger = new Logger('AiAgentObservability');

  constructor(
    private readonly prisma: DatabaseService,
    private readonly metricsService: MetricsService,
  ) {}

  public sanitizeMetadata(
    metadata?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!metadata || typeof metadata !== 'object') {
      return undefined;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (BLACKLISTED_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
        sanitized[key] = '[REDACTED]';
        continue;
      }

      if (typeof value === 'string') {
        let cleanValue = value;
        for (const pattern of SENSITIVE_VALUE_PATTERNS) {
          if (pattern.test(cleanValue)) {
            cleanValue = cleanValue.replace(pattern, '[REDACTED]');
          }
        }
        sanitized[key] = cleanValue;
      } else if (value && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(
          value as Record<string, unknown>,
        );
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map((item: unknown): unknown =>
          typeof item === 'string'
            ? SENSITIVE_VALUE_PATTERNS.some((p) => p.test(item))
              ? '[REDACTED]'
              : item
            : typeof item === 'object' && item !== null
              ? this.sanitizeMetadata(item as Record<string, unknown>)
              : item,
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  async recordEvent(event: AiAgentEvent): Promise<void> {
    const sanitizedMeta = this.sanitizeMetadata(event.meta);

    const logPayload: Record<string, unknown> = {
      event: event.event,
      requestId: event.requestId,
      aiRequestId: event.aiRequestId,
      userId: event.userId,
      toolName: event.toolName,
      durationMs: event.durationMs,
      success: event.success,
      errorCode: event.errorCode,
      operation: event.operation,
      riskLevel: event.riskLevel,
      confirmationId: event.confirmationId,
    };

    if (sanitizedMeta && Object.keys(sanitizedMeta).length > 0) {
      logPayload.meta = sanitizedMeta;
    }

    // Remove undefined properties for clean log output
    Object.keys(logPayload).forEach(
      (key) => logPayload[key] === undefined && delete logPayload[key],
    );

    const message = JSON.stringify(logPayload);

    if (event.success === false || event.errorCode) {
      this.logger.warn(message);
    } else {
      this.logger.log(message);
    }

    // Update bounded metrics
    this.updateMetricsForEvent(event);

    // Persist to audit database for financial audit events
    if (this.shouldAudit(event)) {
      await this.persistAuditEvent(event, sanitizedMeta);
    }
  }

  private updateMetricsForEvent(event: AiAgentEvent): void {
    const tool = event.toolName ? this.normalizeToolName(event.toolName) : null;

    switch (event.event) {
      case 'ai.request.started':
        this.metricsService.increment('ai_requests_total');
        break;
      case 'ai.request.completed':
        this.metricsService.increment('ai_requests_success_total');
        break;
      case 'ai.request.failed':
        this.metricsService.increment('ai_requests_failure_total');
        break;

      case 'ai.llm.started':
        this.metricsService.increment('ai_llm_calls_total');
        break;
      case 'ai.llm.completed':
        this.metricsService.increment('ai_llm_calls_success_total');
        if (event.meta?.tokens && typeof event.meta.tokens === 'object') {
          const tokens = event.meta.tokens as {
            inputTokens?: number;
            outputTokens?: number;
            totalTokens?: number;
          };
          if (tokens.inputTokens) {
            this.metricsService.increment(
              'ai_llm_input_tokens_total',
              tokens.inputTokens,
            );
          }
          if (tokens.outputTokens) {
            this.metricsService.increment(
              'ai_llm_output_tokens_total',
              tokens.outputTokens,
            );
          }
          if (tokens.totalTokens) {
            this.metricsService.increment(
              'ai_llm_total_tokens_total',
              tokens.totalTokens,
            );
          }
        }
        break;
      case 'ai.llm.failed':
        this.metricsService.increment('ai_llm_calls_failure_total');
        break;

      case 'ai.tool.started':
        if (tool) {
          this.metricsService.increment(`ai_tool_invocations_total:${tool}`);
        }
        break;
      case 'ai.tool.completed':
        if (tool) {
          this.metricsService.increment(`ai_tool_success_total:${tool}`);
        }
        break;
      case 'ai.tool.failed':
        if (tool) {
          this.metricsService.increment(`ai_tool_failure_total:${tool}`);
        }
        break;
      case 'ai.tool.validation_failed':
        if (tool) {
          this.metricsService.increment(
            `ai_tool_validation_rejections_total:${tool}`,
          );
        }
        break;
      case 'ai.tool.authorization_denied':
        if (tool) {
          this.metricsService.increment(
            `ai_tool_authorization_rejections_total:${tool}`,
          );
        }
        break;

      case 'ai.confirmation.created':
        this.metricsService.increment('ai_confirmations_created_total');
        this.metricsService.increment(
          'ai_requests_confirmation_required_total',
        );
        break;
      case 'ai.confirmation.confirmed':
        this.metricsService.increment('ai_confirmations_confirmed_total');
        this.metricsService.increment(
          'ai_confirmation_executions_success_total',
        );
        break;
      case 'ai.confirmation.cancelled':
        this.metricsService.increment('ai_confirmations_cancelled_total');
        break;
      case 'ai.confirmation.expired':
        this.metricsService.increment('ai_confirmations_expired_total');
        break;
      case 'ai.confirmation.rejected':
        this.metricsService.increment('ai_confirmations_rejected_total');
        this.metricsService.increment(
          'ai_confirmation_executions_failure_total',
        );
        break;

      case 'ai.conversation.created':
        this.metricsService.increment('ai_conversations_created_total');
        break;
      case 'ai.conversation.message.persisted':
        this.metricsService.increment(
          'ai_conversation_messages_persisted_total',
        );
        break;
      case 'ai.conversation.history.loaded':
        this.metricsService.increment('ai_conversation_history_loaded_total');
        break;
      case 'ai.conversation.deleted':
        this.metricsService.increment('ai_conversations_deleted_total');
        break;

      case 'ai.memory.created':
        this.metricsService.increment('ai_memories_created_total');
        break;
      case 'ai.memory.updated':
        this.metricsService.increment('ai_memories_updated_total');
        break;
      case 'ai.memory.deleted':
        this.metricsService.increment('ai_memories_deleted_total');
        break;
      case 'ai.memory.rejected':
        this.metricsService.increment('ai_memories_rejected_total');
        break;
      case 'ai.memory.loaded':
        this.metricsService.increment('ai_memories_loaded_total');
        break;
    }
  }

  private normalizeToolName(toolName: string): string {
    const allowed = [
      'get_accounts',
      'get_transactions',
      'get_financial_summary',
      'get_budgets',
      'create_transaction',
    ];
    return allowed.includes(toolName) ? toolName : 'unknown_tool';
  }

  private shouldAudit(event: AiAgentEvent): boolean {
    const auditEvents = [
      'ai.confirmation.created',
      'ai.confirmation.confirmed',
      'ai.confirmation.cancelled',
      'ai.confirmation.expired',
      'ai.confirmation.rejected',
    ];

    if (auditEvents.includes(event.event)) {
      return true;
    }

    if (
      (event.event === 'ai.tool.completed' ||
        event.event === 'ai.tool.failed') &&
      event.toolName === 'create_transaction'
    ) {
      return true;
    }

    return false;
  }

  private async persistAuditEvent(
    event: AiAgentEvent,
    sanitizedMeta?: Record<string, unknown>,
  ): Promise<void> {
    if (!event.userId) {
      return;
    }

    try {
      await this.prisma.aiAuditEvent.create({
        data: {
          userId: event.userId,
          requestId: event.requestId,
          aiRequestId: event.aiRequestId,
          eventType: event.event,
          toolName: event.toolName,
          confirmationId: event.confirmationId,
          status: event.success !== false ? 'SUCCESS' : 'FAILED',
          riskLevel: event.riskLevel,
          metadata: (sanitizedMeta ??
            Prisma.DbNull) as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to persist AI audit event: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
