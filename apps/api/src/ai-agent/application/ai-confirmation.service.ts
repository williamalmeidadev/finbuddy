import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { AiConfirmationStatus } from '../../generated/prisma/enums';
import { AiAgentObservabilityService } from './observability/ai-agent-observability.service';
import {
  AiErrorCode,
  AiEventName,
} from './observability/ai-agent-observability.types';

export interface AiConfirmationRecord {
  id: string;
  userId: string;
  requestId?: string | null;
  aiRequestId?: string | null;
  toolName: string;
  argumentsJson: Record<string, any>;
  status: AiConfirmationStatus;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date | null;
}

export interface AiConfirmationOptions {
  requestId?: string;
  aiRequestId?: string;
}

@Injectable()
export class AiConfirmationService {
  private readonly logger = new Logger(AiConfirmationService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly configService: ConfigService,
    private readonly observability: AiAgentObservabilityService,
  ) {}

  async createConfirmation(
    userId: string,
    toolName: string,
    argumentsJson: unknown,
    options?: AiConfirmationOptions,
  ): Promise<AiConfirmationRecord> {
    const ttlSeconds =
      this.configService.get<number>('AI_CONFIRMATION_TTL_SECONDS') ?? 300;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
    const requestId = options?.requestId || 'N/A';
    const aiRequestId = options?.aiRequestId;

    const record = await this.prisma.aiConfirmation.create({
      data: {
        userId,
        requestId,
        aiRequestId,
        toolName,
        argumentsJson: argumentsJson ?? {},
        status: AiConfirmationStatus.PENDING,
        expiresAt,
      },
    });

    this.logger.log(
      `Created AI confirmation request: id=${record.id}, user=${userId}, tool=${toolName}, expiresAt=${expiresAt.toISOString()}`,
    );

    await this.observability.recordEvent({
      event: AiEventName.CONFIRMATION_CREATED,
      requestId,
      aiRequestId,
      userId,
      toolName,
      confirmationId: record.id,
      riskLevel: 'MEDIUM',
      success: true,
      meta: {
        argumentValidation: 'passed',
        argumentCount:
          argumentsJson && typeof argumentsJson === 'object'
            ? Object.keys(argumentsJson).length
            : 0,
        argumentKeys:
          argumentsJson && typeof argumentsJson === 'object'
            ? Object.keys(argumentsJson)
            : [],
      },
    });

    return {
      id: record.id,
      userId: record.userId,
      requestId: record.requestId,
      aiRequestId: record.aiRequestId,
      toolName: record.toolName,
      argumentsJson: record.argumentsJson as Record<string, any>,
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
    };
  }

  async consumeConfirmation(
    confirmationId: string,
    userId: string,
    options?: AiConfirmationOptions,
  ): Promise<AiConfirmationRecord> {
    const now = new Date();
    const reqId = options?.requestId || 'N/A';

    // Atomic update to ensure single-use replay protection and concurrency safety
    const updated = await this.prisma.aiConfirmation.updateMany({
      where: {
        id: confirmationId,
        userId,
        status: AiConfirmationStatus.PENDING,
        expiresAt: {
          gt: now,
        },
      },
      data: {
        status: AiConfirmationStatus.CONSUMED,
        consumedAt: now,
      },
    });

    if (updated.count === 0) {
      // Find existing confirmation to provide precise security error diagnostic
      const existing = await this.prisma.aiConfirmation.findUnique({
        where: { id: confirmationId },
      });

      if (!existing || existing.userId !== userId) {
        this.logger.warn(
          `Confirmation not found or ownership mismatch: id=${confirmationId}, requestingUser=${userId}`,
        );
        await this.observability.recordEvent({
          event: AiEventName.CONFIRMATION_REJECTED,
          requestId: reqId,
          userId,
          confirmationId,
          success: false,
          errorCode: AiErrorCode.AUTHORIZATION_ERROR,
        });
        throw new NotFoundException('Confirmation request not found');
      }

      if (existing.status === AiConfirmationStatus.CONSUMED) {
        this.logger.warn(
          `Replay attempt detected on consumed confirmation: id=${confirmationId}, user=${userId}`,
        );
        await this.observability.recordEvent({
          event: AiEventName.CONFIRMATION_REJECTED,
          requestId: reqId,
          aiRequestId: existing.aiRequestId || undefined,
          userId,
          toolName: existing.toolName,
          confirmationId,
          success: false,
          errorCode: AiErrorCode.CONFIRMATION_ALREADY_CONSUMED,
        });
        throw new BadRequestException(
          'Confirmation request has already been executed',
        );
      }

      if (existing.status === AiConfirmationStatus.CANCELLED) {
        this.logger.warn(
          `Attempt to execute cancelled confirmation: id=${confirmationId}, user=${userId}`,
        );
        await this.observability.recordEvent({
          event: AiEventName.CONFIRMATION_REJECTED,
          requestId: reqId,
          aiRequestId: existing.aiRequestId || undefined,
          userId,
          toolName: existing.toolName,
          confirmationId,
          success: false,
          errorCode: AiErrorCode.CONFIRMATION_CANCELLED,
        });
        throw new BadRequestException(
          'Confirmation request was cancelled by user',
        );
      }

      if (
        existing.expiresAt <= now ||
        existing.status === AiConfirmationStatus.EXPIRED
      ) {
        this.logger.warn(
          `Attempt to execute expired confirmation: id=${confirmationId}, user=${userId}`,
        );
        await this.observability.recordEvent({
          event: AiEventName.CONFIRMATION_EXPIRED,
          requestId: reqId,
          aiRequestId: existing.aiRequestId || undefined,
          userId,
          toolName: existing.toolName,
          confirmationId,
          success: false,
          errorCode: AiErrorCode.CONFIRMATION_EXPIRED,
        });
        throw new BadRequestException('Confirmation request has expired');
      }

      await this.observability.recordEvent({
        event: AiEventName.CONFIRMATION_REJECTED,
        requestId: reqId,
        aiRequestId: existing.aiRequestId || undefined,
        userId,
        toolName: existing.toolName,
        confirmationId,
        success: false,
        errorCode: AiErrorCode.INTERNAL_ERROR,
      });

      throw new BadRequestException('Confirmation request cannot be consumed');
    }

    const record = await this.prisma.aiConfirmation.findUniqueOrThrow({
      where: { id: confirmationId },
    });

    this.logger.log(
      `Consumed AI confirmation request: id=${record.id}, user=${userId}, tool=${record.toolName}`,
    );

    await this.observability.recordEvent({
      event: AiEventName.CONFIRMATION_CONFIRMED,
      requestId: reqId !== 'N/A' ? reqId : record.requestId || 'N/A',
      aiRequestId: record.aiRequestId || undefined,
      userId,
      toolName: record.toolName,
      confirmationId: record.id,
      riskLevel: 'MEDIUM',
      success: true,
    });

    return {
      id: record.id,
      userId: record.userId,
      requestId: record.requestId,
      aiRequestId: record.aiRequestId,
      toolName: record.toolName,
      argumentsJson: record.argumentsJson as Record<string, any>,
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
    };
  }

  async cancelConfirmation(
    confirmationId: string,
    userId: string,
    options?: AiConfirmationOptions,
  ): Promise<AiConfirmationRecord> {
    const reqId = options?.requestId || 'N/A';
    const updated = await this.prisma.aiConfirmation.updateMany({
      where: {
        id: confirmationId,
        userId,
        status: AiConfirmationStatus.PENDING,
      },
      data: {
        status: AiConfirmationStatus.CANCELLED,
      },
    });

    if (updated.count === 0) {
      const existing = await this.prisma.aiConfirmation.findUnique({
        where: { id: confirmationId },
      });

      if (!existing || existing.userId !== userId) {
        await this.observability.recordEvent({
          event: AiEventName.CONFIRMATION_REJECTED,
          requestId: reqId,
          userId,
          confirmationId,
          success: false,
          errorCode: AiErrorCode.AUTHORIZATION_ERROR,
        });
        throw new NotFoundException('Confirmation request not found');
      }

      if (existing.status === AiConfirmationStatus.CANCELLED) {
        return {
          id: existing.id,
          userId: existing.userId,
          requestId: existing.requestId,
          aiRequestId: existing.aiRequestId,
          toolName: existing.toolName,
          argumentsJson: existing.argumentsJson as Record<string, any>,
          status: existing.status,
          createdAt: existing.createdAt,
          expiresAt: existing.expiresAt,
          consumedAt: existing.consumedAt,
        };
      }

      await this.observability.recordEvent({
        event: AiEventName.CONFIRMATION_REJECTED,
        requestId: reqId,
        aiRequestId: existing.aiRequestId || undefined,
        userId,
        toolName: existing.toolName,
        confirmationId,
        success: false,
        errorCode: AiErrorCode.CONFIRMATION_CANCELLED,
      });

      throw new BadRequestException(
        'Confirmation request cannot be cancelled in current status',
      );
    }

    const record = await this.prisma.aiConfirmation.findUniqueOrThrow({
      where: { id: confirmationId },
    });

    this.logger.log(
      `Cancelled AI confirmation request: id=${record.id}, user=${userId}`,
    );

    await this.observability.recordEvent({
      event: AiEventName.CONFIRMATION_CANCELLED,
      requestId: reqId !== 'N/A' ? reqId : record.requestId || 'N/A',
      aiRequestId: record.aiRequestId || undefined,
      userId,
      toolName: record.toolName,
      confirmationId: record.id,
      success: true,
    });

    return {
      id: record.id,
      userId: record.userId,
      requestId: record.requestId,
      aiRequestId: record.aiRequestId,
      toolName: record.toolName,
      argumentsJson: record.argumentsJson as Record<string, any>,
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
    };
  }
}
