import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Root API ping / health status' })
  @ApiResponse({
    status: 200,
    description: 'Root service ping status',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'ok' },
        service: { type: 'string', example: 'finbuddy-api' },
      },
    },
  })
  @Get()
  getHealth() {
    return this.appService.getHealth();
  }
}
