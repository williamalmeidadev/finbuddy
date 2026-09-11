import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthCheckResult, HealthService } from './health.service';

@ApiTags('Health')
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @ApiOperation({
    summary: 'Liveness health check probe (verifies API process is running)',
  })
  @ApiResponse({
    status: 200,
    description: 'API process is healthy and responding',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
      },
    },
  })
  @Get('live')
  @HttpCode(HttpStatus.OK)
  getLiveness(): HealthCheckResult {
    return this.healthService.getLiveness();
  }

  @ApiOperation({
    summary:
      'Readiness health check probe (verifies PostgreSQL DB connectivity)',
  })
  @ApiResponse({
    status: 200,
    description: 'Database connection is active and ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        info: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'up' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Database is unreachable or degraded',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'error' },
        error: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                status: { type: 'string', example: 'down' },
              },
            },
          },
        },
      },
    },
  })
  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness(): Promise<HealthCheckResult> {
    return this.healthService.getReadiness();
  }
}
