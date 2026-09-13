import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentObservabilityService } from './ai-agent-observability.service';
import { DatabaseService } from '../../../database/database.service';
import { MetricsService } from '../../../common/metrics/metrics.service';
import { AiErrorCode, AiEventName } from './ai-agent-observability.types';

describe('AiAgentObservabilityService', () => {
  let service: AiAgentObservabilityService;
  let mockDatabaseService: {
    aiAuditEvent: {
      create: jest.Mock;
    };
  };
  let mockMetricsService: {
    increment: jest.Mock;
  };

  beforeEach(async () => {
    mockDatabaseService = {
      aiAuditEvent: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };
    mockMetricsService = {
      increment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentObservabilityService,
        { provide: DatabaseService, useValue: mockDatabaseService },
        { provide: MetricsService, useValue: mockMetricsService },
      ],
    }).compile();

    service = module.get<AiAgentObservabilityService>(
      AiAgentObservabilityService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordEvent', () => {
    it('should record AI agent request started event and update metric', async () => {
      await service.recordEvent({
        event: AiEventName.REQUEST_STARTED,
        requestId: 'req-123',
        aiRequestId: 'ai-req-456',
        userId: 'user-789',
      });

      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_requests_total',
      );
    });

    it('should record request failed event with error code and increment failure metric', async () => {
      await service.recordEvent({
        event: AiEventName.REQUEST_FAILED,
        requestId: 'req-123',
        aiRequestId: 'ai-req-456',
        userId: 'user-789',
        success: false,
        errorCode: AiErrorCode.INTERNAL_ERROR,
      });

      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_requests_failure_total',
      );
    });

    it('should record tool execution events with normalized metric label', async () => {
      await service.recordEvent({
        event: AiEventName.TOOL_COMPLETED,
        requestId: 'req-123',
        aiRequestId: 'ai-req-456',
        userId: 'user-789',
        toolName: 'get_accounts',
        durationMs: 45,
        success: true,
      });

      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_tool_success_total:get_accounts',
      );
    });

    it('should record confirmation events and persist audit record', async () => {
      await service.recordEvent({
        event: AiEventName.CONFIRMATION_CREATED,
        requestId: 'req-123',
        aiRequestId: 'ai-req-456',
        userId: 'user-789',
        confirmationId: 'conf-999',
        toolName: 'create_transaction',
        success: true,
      });

      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_confirmations_created_total',
      );
      expect(mockMetricsService.increment).toHaveBeenCalledWith(
        'ai_requests_confirmation_required_total',
      );
      expect(mockDatabaseService.aiAuditEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-789',
          requestId: 'req-123',
          aiRequestId: 'ai-req-456',
          eventType: AiEventName.CONFIRMATION_CREATED,
          confirmationId: 'conf-999',
          status: 'SUCCESS',
        }),
      });
    });
  });

  describe('privacy & secret redaction (sanitizeMetadata)', () => {
    it('should sanitize and redact sensitive keys and values in metadata', () => {
      const result = service.sanitizeMetadata({
        apiKey: 'sk-proj-1234567890abcdef',
        password: 'SuperSecretPassword',
        amount: 500.0,
        balance: 10000.0,
        description: 'Salary payment',
        jwt: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        connectionString: 'postgres://user:pass@localhost:5432/db',
        safeKey: 'normal_value',
      });

      expect(result).toEqual({
        apiKey: '[REDACTED]',
        password: '[REDACTED]',
        amount: '[REDACTED]',
        balance: '[REDACTED]',
        description: '[REDACTED]',
        jwt: '[REDACTED]',
        connectionString: '[REDACTED]',
        safeKey: 'normal_value',
      });
    });

    it('should redact sensitive string patterns embedded inside nested metadata objects when audited', async () => {
      await service.recordEvent({
        event: AiEventName.CONFIRMATION_CREATED,
        requestId: 'req-123',
        aiRequestId: 'ai-req-456',
        userId: 'user-789',
        toolName: 'create_transaction',
        confirmationId: 'conf-1',
        meta: {
          nested: {
            authHeader: 'Bearer my-secret-token-123',
            openAiKey: 'sk-1234567890abcdef',
          },
        },
      });

      const auditCall =
        mockDatabaseService.aiAuditEvent.create.mock.calls[0][0];
      expect(auditCall.data.metadata.nested.authHeader).toBe('[REDACTED]');
      expect(auditCall.data.metadata.nested.openAiKey).toBe('[REDACTED]');
    });
  });

  describe('resilience', () => {
    it('should swallow database errors gracefully without throwing', async () => {
      mockDatabaseService.aiAuditEvent.create.mockRejectedValue(
        new Error('Database write error'),
      );

      await expect(
        service.recordEvent({
          event: AiEventName.CONFIRMATION_CREATED,
          requestId: 'req-123',
          aiRequestId: 'ai-req-456',
          userId: 'user-789',
        }),
      ).resolves.not.toThrow();
    });
  });
});
