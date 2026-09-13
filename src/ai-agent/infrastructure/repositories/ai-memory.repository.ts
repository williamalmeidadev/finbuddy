import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service';
import { AiMemoryModel as AiMemory } from '../../../generated/prisma/models/AiMemory';
import { AiMemoryType } from '../../../generated/prisma/enums';

export interface UpsertMemoryData {
  userId: string;
  type: AiMemoryType;
  key: string;
  value: string;
}

@Injectable()
export class AiMemoryRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async upsertForUser(data: UpsertMemoryData): Promise<AiMemory> {
    return this.prisma.aiMemory.upsert({
      where: {
        userId_type_key: {
          userId: data.userId,
          type: data.type,
          key: data.key,
        },
      },
      update: {
        value: data.value,
        updatedAt: new Date(),
      },
      create: {
        userId: data.userId,
        type: data.type,
        key: data.key,
        value: data.value,
      },
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<AiMemory | null> {
    return this.prisma.aiMemory.findFirst({
      where: {
        id,
        userId,
      },
    });
  }

  async findByKeyForUser(
    userId: string,
    type: AiMemoryType,
    key: string,
  ): Promise<AiMemory | null> {
    return this.prisma.aiMemory.findFirst({
      where: {
        userId,
        type,
        key,
      },
    });
  }

  async listForUser(userId: string, type?: AiMemoryType): Promise<AiMemory[]> {
    return this.prisma.aiMemory.findMany({
      where: {
        userId,
        ...(type ? { type } : {}),
      },
      orderBy: [{ type: 'asc' }, { key: 'asc' }],
    });
  }

  async countForUser(userId: string): Promise<number> {
    return this.prisma.aiMemory.count({
      where: { userId },
    });
  }

  async updateValue(
    id: string,
    userId: string,
    value: string,
  ): Promise<AiMemory | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return null;
    }

    return this.prisma.aiMemory.update({
      where: { id },
      data: {
        value,
        updatedAt: new Date(),
      },
    });
  }

  async deleteById(id: string, userId: string): Promise<boolean> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return false;
    }

    await this.prisma.aiMemory.delete({
      where: { id },
    });

    return true;
  }

  async deleteAllForUser(userId: string): Promise<number> {
    const res = await this.prisma.aiMemory.deleteMany({
      where: { userId },
    });
    return res.count;
  }
}
