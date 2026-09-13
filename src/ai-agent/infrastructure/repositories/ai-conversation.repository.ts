import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AiConversationModel as AiConversation } from '../../../generated/prisma/models/AiConversation';
import { AiConversationMessageModel as AiConversationMessage } from '../../../generated/prisma/models/AiConversationMessage';
import { ConversationMessageRole } from '../../../generated/prisma/enums';

export interface CreateConversationData {
  userId: string;
  title?: string;
}

export interface AddMessageData {
  conversationId: string;
  role: ConversationMessageRole;
  content: string;
  sequenceNumber: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
}

@Injectable()
export class AiConversationRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async createConversation(
    data: CreateConversationData,
  ): Promise<AiConversation> {
    return this.prisma.aiConversation.create({
      data: {
        userId: data.userId,
        title: data.title,
      },
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<AiConversation | null> {
    return this.prisma.aiConversation.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async findByUserIdPaginated(
    userId: string,
    skip: number,
    take: number,
  ): Promise<PaginatedResult<AiConversation>> {
    const [items, total] = await Promise.all([
      this.prisma.aiConversation.findMany({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.aiConversation.count({
        where: { userId },
      }),
    ]);

    return { items, total };
  }

  async findMessagesByConversationIdPaginated(
    conversationId: string,
    userId: string,
    skip: number,
    take: number,
  ): Promise<PaginatedResult<AiConversationMessage> | null> {
    const conversation = await this.findByIdAndUserId(conversationId, userId);
    if (!conversation) {
      return null;
    }

    const [items, total] = await Promise.all([
      this.prisma.aiConversationMessage.findMany({
        where: { conversationId },
        orderBy: { sequenceNumber: 'asc' },
        skip,
        take,
      }),
      this.prisma.aiConversationMessage.count({
        where: { conversationId },
      }),
    ]);

    return { items, total };
  }

  async getRecentMessages(
    conversationId: string,
    take: number,
  ): Promise<AiConversationMessage[]> {
    const messages = await this.prisma.aiConversationMessage.findMany({
      where: { conversationId },
      orderBy: { sequenceNumber: 'desc' },
      take,
    });

    return messages.reverse();
  }

  async getNextSequenceNumber(conversationId: string): Promise<number> {
    const lastMessage = await this.prisma.aiConversationMessage.findFirst({
      where: { conversationId },
      orderBy: { sequenceNumber: 'desc' },
      select: { sequenceNumber: true },
    });

    return (lastMessage?.sequenceNumber ?? 0) + 1;
  }

  async addMessage(data: AddMessageData): Promise<AiConversationMessage> {
    const [message] = await this.prisma.$transaction([
      this.prisma.aiConversationMessage.create({
        data: {
          conversationId: data.conversationId,
          role: data.role,
          content: data.content,
          sequenceNumber: data.sequenceNumber,
        },
      }),
      this.prisma.aiConversation.update({
        where: { id: data.conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  async touchUpdatedAt(id: string): Promise<void> {
    await this.prisma.aiConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
  }

  async deleteConversation(id: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return false;
    }

    await this.prisma.aiConversation.delete({
      where: { id },
    });

    return true;
  }
}
