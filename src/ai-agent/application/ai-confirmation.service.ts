import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { AiConfirmationStatus } from '../../generated/prisma/enums';

export interface AiConfirmationRecord {
  id: string;
  userId: string;
  toolName: string;
  argumentsJson: Record<string, any>;
  status: AiConfirmationStatus;
  createdAt: Date;
  expiresAt: Date;
  consumedAt?: Date | null;
}

@Injectable()
export class AiConfirmationService {
  private readonly logger = new Logger(AiConfirmationService.name);

  constructor(
    private readonly prisma: DatabaseService,
    private readonly configService: ConfigService,
  ) {}

  async createConfirmation(
    userId: string,
    toolName: string,
    argumentsJson: unknown,
  ): Promise<AiConfirmationRecord> {
    const ttlSeconds =
      this.configService.get<number>('AI_CONFIRMATION_TTL_SECONDS') ?? 300;
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    const record = await this.prisma.aiConfirmation.create({
      data: {
        userId,
        toolName,
        argumentsJson: argumentsJson as Record<string, unknown>,
        status: AiConfirmationStatus.PENDING,
        expiresAt,
      },
    });

    this.logger.log(
      `Created AI confirmation request: id=${record.id}, user=${userId}, tool=${toolName}, expiresAt=${expiresAt.toISOString()}`,
    );

    return {
      id: record.id,
      userId: record.userId,
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
  ): Promise<AiConfirmationRecord> {
    const now = new Date();

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
        throw new NotFoundException('Confirmation request not found');
      }

      if (existing.status === AiConfirmationStatus.CONSUMED) {
        this.logger.warn(
          `Replay attempt detected on consumed confirmation: id=${confirmationId}, user=${userId}`,
        );
        throw new BadRequestException(
          'Confirmation request has already been executed',
        );
      }

      if (existing.status === AiConfirmationStatus.CANCELLED) {
        this.logger.warn(
          `Attempt to execute cancelled confirmation: id=${confirmationId}, user=${userId}`,
        );
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
        throw new BadRequestException('Confirmation request has expired');
      }

      throw new BadRequestException('Confirmation request cannot be consumed');
    }

    const record = await this.prisma.aiConfirmation.findUniqueOrThrow({
      where: { id: confirmationId },
    });

    this.logger.log(
      `Consumed AI confirmation request: id=${record.id}, user=${userId}, tool=${record.toolName}`,
    );

    return {
      id: record.id,
      userId: record.userId,
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
  ): Promise<AiConfirmationRecord> {
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
        throw new NotFoundException('Confirmation request not found');
      }

      if (existing.status === AiConfirmationStatus.CANCELLED) {
        return {
          id: existing.id,
          userId: existing.userId,
          toolName: existing.toolName,
          argumentsJson: existing.argumentsJson as Record<string, any>,
          status: existing.status as AiConfirmationStatus,
          createdAt: existing.createdAt,
          expiresAt: existing.expiresAt,
          consumedAt: existing.consumedAt,
        };
      }

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

    return {
      id: record.id,
      userId: record.userId,
      toolName: record.toolName,
      argumentsJson: record.argumentsJson as Record<string, any>,
      status: record.status,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      consumedAt: record.consumedAt,
    };
  }
}
