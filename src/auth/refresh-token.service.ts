import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';

import { RefreshTokenRepository } from './refresh-token.repository';

@Injectable()
export class RefreshTokenService {
    private readonly refreshTokenTtlMs =
        1000 * 60 * 60 * 24 * 30;

    constructor(
        private readonly refreshTokenRepository: RefreshTokenRepository,
    ) {}

    async create(userId: string): Promise<string> {
        const token = randomBytes(32).toString('hex');

        const tokenHash = await this.hashToken(token);

        const expiresAt = new Date(
            Date.now() + this.refreshTokenTtlMs,
        );

        await this.refreshTokenRepository.create({
            userId,
            tokenHash,
            expiresAt,
        });

        return token;
    }

    async validate(token: string) {
        const tokenHash = await this.hashToken(token);

        const refreshToken =
            await this.refreshTokenRepository.findByTokenHash(
                tokenHash,
            );

        if (!refreshToken) {
            throw new UnauthorizedException(
                'Invalid refresh token',
            );
        }

        if (refreshToken.revokedAt) {
            throw new UnauthorizedException(
                'Invalid refresh token',
            );
        }

        if (refreshToken.expiresAt <= new Date()) {
            throw new UnauthorizedException(
                'Invalid refresh token',
            );
        }

        await this.refreshTokenRepository.updateLastUsed(
            refreshToken.id,
        );

        return refreshToken;
    }

    async revoke(token: string): Promise<void> {
        const tokenHash = await this.hashToken(token);

        const refreshToken =
            await this.refreshTokenRepository.findByTokenHash(
                tokenHash,
            );

        if (!refreshToken) {
            return;
        }

        await this.refreshTokenRepository.revoke(
            refreshToken.id,
        );
    }

    private async hashToken(token: string): Promise<string> {
        const { createHash } = await import('crypto');

        return createHash('sha256')
            .update(token)
            .digest('hex');
    }
}