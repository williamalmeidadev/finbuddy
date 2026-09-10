import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { Prisma } from '../generated/prisma/client';
import { AccountModel as Account } from '../generated/prisma/models/Account';

@Injectable()
export class AccountRepository {
  constructor(private readonly prisma: DatabaseService) {}

  async create(data: Prisma.AccountUncheckedCreateInput): Promise<Account> {
    return this.prisma.account.create({
      data,
    });
  }

  async findByIdAndUserId(id: string, userId: string): Promise<Account | null> {
    return this.prisma.account.findFirst({
      where: { id, userId },
    });
  }

  async findByUserId(userId: string): Promise<Account[]> {
    return this.prisma.account.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    userId: string,
    data: Prisma.AccountUpdateInput,
  ): Promise<Account | null> {
    const existing = await this.findByIdAndUserId(id, userId);
    if (!existing) {
      return null;
    }
    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  async deactivate(id: string, userId: string): Promise<Account | null> {
    return this.update(id, userId, { isActive: false });
  }
}
