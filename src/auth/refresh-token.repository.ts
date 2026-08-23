import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RefreshToken } from '../generated/prisma/client';

@Injectable()
export class RefreshTokenRepository {
    constructor(
        private readonly prisma: PrismaService,
    ) {}

    async create(data: {
        userId: string;
        tokenHash: string;
        expiresAt: Date;
    }): Promise<RefreshToken> {
        return this.prisma.refreshToken.create({
            data,
        });
    }

    async findByTokenHash(
        tokenHash: string,
    ): Promise<RefreshToken | null> {
        return this.prisma.refreshToken.findFirst({
            where: {
                tokenHash,
            },
        });
    }

    async revoke(id: string): Promise<RefreshToken> {
        return this.prisma.refreshToken.update({
            where: {
                id,
            },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    async updateLastUsed(id: string): Promise<RefreshToken> {
        return this.prisma.refreshToken.update({
            where: {
                id,
            },
            data: {
                lastUsedAt: new Date(),
            },
        });
    }
}