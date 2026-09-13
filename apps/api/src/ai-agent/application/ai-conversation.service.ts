import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AiConversationRepository } from '../infrastructure/repositories/ai-conversation.repository';
import { AiConversationModel as AiConversation } from '../../generated/prisma/models/AiConversation';
import { AiConversationMessageModel as AiConversationMessage } from '../../generated/prisma/models/AiConversationMessage';
import { ConversationMessageRole } from '../../generated/prisma/enums';
import { AiAgentObservabilityService } from './observability/ai-agent-observability.service';
import { AiEventName } from './observability/ai-agent-observability.types';

export interface RequestCorrelationOptions {
  requestId?: string;
  aiRequestId?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AiConversationService {
  private readonly logger = new Logger(AiConversationService.name);
  public readonly MAX_CONVERSATION_MESSAGES = 20;

  constructor(
    private readonly conversationRepository: AiConversationRepository,
    private readonly observability: AiAgentObservabilityService,
  ) {}

  async createConversation(
    userId: string,
    title?: string,
    options?: RequestCorrelationOptions,
  ): Promise<AiConversation> {
    const requestId = options?.requestId || 'N/A';
    const aiRequestId = options?.aiRequestId;

    const trimmedTitle = title ? title.trim().slice(0, 200) : undefined;
    const conversation = await this.conversationRepository.createConversation({
      userId,
      title: trimmedTitle,
    });

    this.logger.log(
      `Created conversation: id=${conversation.id}, userId=${userId}`,
    );

    await this.observability.recordEvent({
      event: AiEventName.CONVERSATION_CREATED,
      requestId,
      aiRequestId,
      userId,
      success: true,
      meta: {
        conversationId: conversation.id,
      },
    });

    return conversation;
  }

  async getConversation(id: string, userId: string): Promise<AiConversation> {
    const conversation = await this.conversationRepository.findByIdAndUserId(
      id,
      userId,
    );
    if (!conversation) {
      this.logger.warn(
        `Conversation not found or access denied: id=${id}, userId=${userId}`,
      );
      throw new NotFoundException(`Conversation with ID '${id}' not found`);
    }
    return conversation;
  }

  async getUserConversations(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<AiConversation>> {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(50, Math.max(1, limit));
    const skip = (validPage - 1) * validLimit;

    const result = await this.conversationRepository.findByUserIdPaginated(
      userId,
      skip,
      validLimit,
    );

    const totalPages = Math.ceil(result.total / validLimit) || 1;

    return {
      items: result.items,
      total: result.total,
      page: validPage,
      limit: validLimit,
      totalPages,
    };
  }

  async getConversationMessages(
    conversationId: string,
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<PaginatedResponse<AiConversationMessage>> {
    const validPage = Math.max(1, page);
    const validLimit = Math.min(100, Math.max(1, limit));
    const skip = (validPage - 1) * validLimit;

    const result =
      await this.conversationRepository.findMessagesByConversationIdPaginated(
        conversationId,
        userId,
        skip,
        validLimit,
      );

    if (!result) {
      this.logger.warn(
        `Failed to fetch messages - Conversation not found: id=${conversationId}, userId=${userId}`,
      );
      throw new NotFoundException(
        `Conversation with ID '${conversationId}' not found`,
      );
    }

    const totalPages = Math.ceil(result.total / validLimit) || 1;

    return {
      items: result.items,
      total: result.total,
      page: validPage,
      limit: validLimit,
      totalPages,
    };
  }

  async getRecentHistory(
    conversationId: string,
    userId: string,
    limit: number = this.MAX_CONVERSATION_MESSAGES,
    options?: RequestCorrelationOptions,
  ): Promise<AiConversationMessage[]> {
    // Validate ownership first
    await this.getConversation(conversationId, userId);

    const requestId = options?.requestId || 'N/A';
    const aiRequestId = options?.aiRequestId;

    const messages = await this.conversationRepository.getRecentMessages(
      conversationId,
      Math.min(limit, this.MAX_CONVERSATION_MESSAGES),
    );

    await this.observability.recordEvent({
      event: AiEventName.CONVERSATION_HISTORY_LOADED,
      requestId,
      aiRequestId,
      userId,
      success: true,
      meta: {
        conversationId,
        messageCount: messages.length,
      },
    });

    return messages;
  }

  async appendMessage(
    conversationId: string,
    userId: string,
    role: ConversationMessageRole,
    content: string,
    options?: RequestCorrelationOptions,
  ): Promise<AiConversationMessage> {
    if (
      role !== ConversationMessageRole.USER &&
      role !== ConversationMessageRole.ASSISTANT
    ) {
      throw new BadRequestException(
        `Invalid message role '${role as string}'. Only USER and ASSISTANT are permitted.`,
      );
    }

    if (!content || content.trim().length === 0) {
      throw new BadRequestException('Message content cannot be empty');
    }

    // Verify ownership
    await this.getConversation(conversationId, userId);

    const requestId = options?.requestId || 'N/A';
    const aiRequestId = options?.aiRequestId;

    const truncatedContent = content.slice(0, 4000);
    const sequenceNumber =
      await this.conversationRepository.getNextSequenceNumber(conversationId);

    const message = await this.conversationRepository.addMessage({
      conversationId,
      role,
      content: truncatedContent,
      sequenceNumber,
    });

    await this.observability.recordEvent({
      event: AiEventName.CONVERSATION_MESSAGE_PERSISTED,
      requestId,
      aiRequestId,
      userId,
      success: true,
      meta: {
        conversationId,
        messageId: message.id,
        role: message.role,
        sequenceNumber: message.sequenceNumber,
      },
    });

    return message;
  }

  async deleteConversation(
    id: string,
    userId: string,
    options?: RequestCorrelationOptions,
  ): Promise<boolean> {
    const requestId = options?.requestId || 'N/A';
    const aiRequestId = options?.aiRequestId;

    const deleted = await this.conversationRepository.deleteConversation(
      id,
      userId,
    );

    if (!deleted) {
      this.logger.warn(
        `Failed to delete conversation (not found or access denied): id=${id}, userId=${userId}`,
      );
      throw new NotFoundException(`Conversation with ID '${id}' not found`);
    }

    this.logger.log(`Deleted conversation: id=${id}, userId=${userId}`);

    await this.observability.recordEvent({
      event: AiEventName.CONVERSATION_DELETED,
      requestId,
      aiRequestId,
      userId,
      success: true,
      meta: {
        conversationId: id,
      },
    });

    return true;
  }
}
