import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
  CreateConversationDto,
  ListConversationsQueryDto,
  ListMessagesQueryDto,
  ConversationResponseDto,
  PaginatedConversationsResponseDto,
  PaginatedMessagesResponseDto,
} from './dto/conversation.dtos';
import {
  CreateMemoryDto,
  ListMemoriesQueryDto,
  MemoryResponseDto,
  UpdateMemoryDto,
} from './dto/memory.dtos';
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
    const result = await this.aiAgentService.sendMessage(user.id, dto.message, {
      ...options,
      conversationId: dto.conversationId,
    });
    return new AgentResponseDto(
      result.message,
      result.type,
      result.confirmation,
      result.conversationId,
    );
  }

  @ApiOperation({ summary: 'Create a new AI conversation session' })
  @ApiResponse({
    status: 201,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateConversationDto,
    @Req() req: Request,
  ): Promise<ConversationResponseDto> {
    const options = this.getCorrelationOptions(req);
    return this.aiAgentService.createConversation(user.id, dto.title, options);
  }

  @ApiOperation({ summary: 'List paginated AI conversations for current user' })
  @ApiResponse({
    status: 200,
    description: 'Paginated conversations list',
    type: PaginatedConversationsResponseDto,
  })
  @Get('conversations')
  async listConversations(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: ListConversationsQueryDto,
  ): Promise<PaginatedConversationsResponseDto> {
    return this.aiAgentService.getUserConversations(
      user.id,
      query.page,
      query.limit,
    );
  }

  @ApiOperation({ summary: 'Get single conversation metadata' })
  @ApiParam({
    name: 'conversationId',
    description: 'UUID of the conversation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation details',
    type: ConversationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @Get('conversations/:conversationId')
  async getConversation(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ): Promise<ConversationResponseDto> {
    return this.aiAgentService.getConversation(conversationId, user.id);
  }

  @ApiOperation({ summary: 'List paginated messages in a conversation' })
  @ApiParam({
    name: 'conversationId',
    description: 'UUID of the conversation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated messages list',
    type: PaginatedMessagesResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @Get('conversations/:conversationId/messages')
  async listMessages(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query() query: ListMessagesQueryDto,
  ): Promise<PaginatedMessagesResponseDto> {
    return this.aiAgentService.getConversationMessages(
      conversationId,
      user.id,
      query.page,
      query.limit,
    );
  }

  @ApiOperation({ summary: 'Delete a conversation and its message history' })
  @ApiParam({
    name: 'conversationId',
    description: 'UUID of the conversation',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Conversation deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  @Delete('conversations/:conversationId')
  @HttpCode(HttpStatus.OK)
  async deleteConversation(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const options = this.getCorrelationOptions(req);
    await this.aiAgentService.deleteConversation(
      conversationId,
      user.id,
      options,
    );
    return {
      success: true,
      message: 'Conversation deleted successfully',
    };
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

  @ApiOperation({ summary: 'Save or update a structured user memory entry' })
  @ApiResponse({
    status: 201,
    description: 'Memory saved successfully',
    type: MemoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or limit reached',
  })
  @Post('memories')
  @HttpCode(HttpStatus.CREATED)
  async saveMemory(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateMemoryDto,
    @Req() req: Request,
  ): Promise<MemoryResponseDto> {
    const options = this.getCorrelationOptions(req);
    return this.aiAgentService.saveMemory(user.id, dto, options);
  }

  @ApiOperation({ summary: 'List structured user memories' })
  @ApiResponse({
    status: 200,
    description: 'List of user memories',
    type: [MemoryResponseDto],
  })
  @Get('memories')
  async listMemories(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: ListMemoriesQueryDto,
    @Req() req: Request,
  ): Promise<MemoryResponseDto[]> {
    const options = this.getCorrelationOptions(req);
    return this.aiAgentService.getUserMemories(user.id, query, options);
  }

  @ApiOperation({ summary: 'Get a single user memory entry by ID' })
  @ApiParam({
    name: 'memoryId',
    description: 'UUID of the memory entry',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Memory entry details',
    type: MemoryResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Memory entry not found' })
  @Get('memories/:memoryId')
  async getMemory(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('memoryId', ParseUUIDPipe) memoryId: string,
  ): Promise<MemoryResponseDto> {
    return this.aiAgentService.getMemory(memoryId, user.id);
  }

  @ApiOperation({ summary: 'Update a user memory entry value' })
  @ApiParam({
    name: 'memoryId',
    description: 'UUID of the memory entry',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Memory updated successfully',
    type: MemoryResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 404, description: 'Memory entry not found' })
  @Patch('memories/:memoryId')
  async updateMemory(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('memoryId', ParseUUIDPipe) memoryId: string,
    @Body() dto: UpdateMemoryDto,
    @Req() req: Request,
  ): Promise<MemoryResponseDto> {
    const options = this.getCorrelationOptions(req);
    return this.aiAgentService.updateMemory(memoryId, user.id, dto, options);
  }

  @ApiOperation({ summary: 'Delete a single user memory entry' })
  @ApiParam({
    name: 'memoryId',
    description: 'UUID of the memory entry',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Memory entry deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Memory entry not found' })
  @Delete('memories/:memoryId')
  @HttpCode(HttpStatus.OK)
  async deleteMemory(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('memoryId', ParseUUIDPipe) memoryId: string,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string }> {
    const options = this.getCorrelationOptions(req);
    await this.aiAgentService.deleteMemory(memoryId, user.id, options);
    return {
      success: true,
      message: 'Memory entry deleted successfully',
    };
  }

  @ApiOperation({ summary: 'Delete all memories for the authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'All user memories deleted successfully',
  })
  @Delete('memories')
  @HttpCode(HttpStatus.OK)
  async deleteAllMemories(
    @CurrentUser() user: AuthenticatedUserDto,
    @Req() req: Request,
  ): Promise<{ success: boolean; message: string; deletedCount: number }> {
    const options = this.getCorrelationOptions(req);
    const count = await this.aiAgentService.deleteAllMemories(user.id, options);
    return {
      success: true,
      message: 'All user memories deleted successfully',
      deletedCount: count,
    };
  }
}
