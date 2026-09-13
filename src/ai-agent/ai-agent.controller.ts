import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
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
  ): Promise<AgentResponseDto> {
    const result = await this.aiAgentService.sendMessage(user.id, dto.message);
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
  ): Promise<ConfirmationExecutionResult> {
    return this.aiAgentService.confirmAction(user.id, confirmationId);
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
  ): Promise<{ success: boolean; message: string }> {
    return this.aiAgentService.cancelAction(user.id, confirmationId);
  }
}
