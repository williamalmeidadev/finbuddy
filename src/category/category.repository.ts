import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { CategoryType } from '../generated/prisma/enums';
import { CategoryModel as Category } from '../generated/prisma/models/Category';

@Injectable()
export class CategoryRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async create(data: Prisma.CategoryUncheckedCreateInput): Promise<Category> {
    return this.prisma.category.create({
      data,
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: { id, userId },
    });
  }

  async findByNameAndUserId(
    name: string,
    userId: string,
    type: CategoryType,
  ): Promise<Category | null> {
    return this.prisma.category.findFirst({
      where: {
        userId,
        name: { equals: name, mode: 'insensitive' },
        type,
      },
    });
  }

  async findByUserId(
    userId: string,
    options?: { includeInactive?: boolean; type?: CategoryType },
  ): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: {
        userId,
        ...(!options?.includeInactive ? { isActive: true } : {}),
        ...(options?.type ? { type: options.type } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Prisma.CategoryUpdateInput,
  ): Promise<Category | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return null;
    }
    return this.prisma.category.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string, userId: string): Promise<Category | null> {
    return this.update(id, userId, { isActive: false });
  }
}
