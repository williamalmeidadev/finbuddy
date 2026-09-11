import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthCheckResult, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  getLiveness(): HealthCheckResult {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async getReadiness(): Promise<HealthCheckResult> {
    return this.healthService.getReadiness();
  }
}
