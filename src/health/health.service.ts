import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface HealthCheckResult {
  status: 'ok' | 'error';
  info?: Record<string, { status: 'up' | 'down' }>;
  error?: Record<string, { status: 'up' | 'down' }>;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: DatabaseService) {}

  getLiveness(): HealthCheckResult {
    return {
      status: 'ok',
    };
  }

  async getReadiness(): Promise<HealthCheckResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
      };
    } catch {
      throw new ServiceUnavailableException({
        status: 'error',
        error: {
          database: {
            status: 'down',
          },
        },
      });
    }
  }
}
