import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import {
  AiAgentService,
  ConfirmationExecutionResult,
} from './ai-agent.service';

@ApiTags('AI Agent')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({
  status: 429,
  description: 'Too Many Requests - Rate limit exceeded',
})
@ApiResponse({
  status: 503,
  description: 'AI service temporarily unavailable',
})
@UseGuards(JwtAuthGuard)
@Controller('ai-agent')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  private getCorrelationOptions(req?: Request) {
    if (!req) {
      return { requestId: undefined, aiRequestId: undefined };
    }
    const requestId =
      (req as Request & { requestId?: string }).requestId ||
      (typeof req.header === 'function'
        ? req.header('x-request-id')
        : undefined) ||
      undefined;
    const aiRequestId =
      typeof req.header === 'function'
        ? req.header('x-ai-request-id')
        : undefined;
    return { requestId, aiRequestId };
  }

  @ApiOperation({ summary: 'Send a message to the AI financial assistant' })
  @ApiResponse({
    status: 200,
    description: 'AI assistant response',
    type: AgentResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post('messages')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: SendAgentMessageDto,
    @Req() req: Request,
  ): Promise<AgentResponseDto> {
    const options = this.getCorrelationOptions(req);
    const result = await this.aiAgentService.sendMessage(
      user.id,
      dto.message,
      options,
    );
    return new AgentResponseDto(
      result.message,
      result.type,
      result.confirmation,
    );
  }

  @ApiOperation({
    summary: 'Confirm and execute a pending AI financial action',
  })
  @ApiParam({
    name: 'confirmationId',
    description: 'UUID of the pending confirmation request',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Financial action executed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Confirmation expired, consumed, or invalid',
  })
  @ApiResponse({ status: 404, description: 'Confirmation not found' })
  @Post('confirmations/:confirmationId')
  @HttpCode(HttpStatus.OK)
  async confirmAction(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('confirmationId', ParseUUIDPipe) confirmationId: string,
    @Req() req: Request,
  ): Promise<ConfirmationExecutionResult> {
    const options = this.getCorrelationOptions(req);
    return this.aiAgentService.confirmAction(user.id, confirmationId, options);
  }

  @ApiOperation({
    summary: 'Cancel a pending AI financial confirmation request',
  })
  @ApiParam({
    name: 'confirmationId',
    description: 'UUID of the pending confirmation request',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Confirmation request cancelled',
  })
  @ApiResponse({ status: 404, description: 'Confirmation not found' })
  @Post('confirmations/:confirmationId/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelAction(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('confirmationId', ParseUUIDPipe) confirmationId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const options = this.getCorrelationOptions(req);
    return this.aiAgentService.cancelAction(user.id, confirmationId, options);
  }
}
