import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { AiAgentService } from './ai-agent.service';

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
    return new AgentResponseDto(result.message);
  }
}
