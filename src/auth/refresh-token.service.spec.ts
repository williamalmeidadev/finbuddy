import { UnauthorizedException } from '@nestjs/common';

import { RefreshTokenService } from './refresh-token.service';
import { RefreshTokenRepository } from './refresh-token.repository';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;

  let refreshTokenRepository: {
    create: jest.Mock;
    findByTokenHash: jest.Mock;
    revoke: jest.Mock;
    updateLastUsed: jest.Mock;
  };

  beforeEach(() => {
    refreshTokenRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      revoke: jest.fn(),
      updateLastUsed: jest.fn(),
    };

    service = new RefreshTokenService(
      refreshTokenRepository as unknown as RefreshTokenRepository,
    );
  });

  describe('create', () => {
    it('should create and persist a refresh token', async () => {
      refreshTokenRepository.create.mockResolvedValue({
        id: 'refresh-token-id',
      });

      const token = await service.create('user-id');

      expect(token).toEqual(expect.any(String));
      expect(token).toHaveLength(64);

      expect(refreshTokenRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-id',
          tokenHash: expect.any(String),
          expiresAt: expect.any(Date),
        }),
      );
    });
  });

  describe('validate', () => {
    const token = 'refresh-token';

    const storedToken = {
      id: 'refresh-token-id',
      userId: 'user-id',
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should validate a valid refresh token', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue(storedToken);

      refreshTokenRepository.updateLastUsed.mockResolvedValue(storedToken);

      const result = await service.validate(token);

      expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
        expect.any(String),
      );

      expect(refreshTokenRepository.updateLastUsed).toHaveBeenCalledWith(
        storedToken.id,
      );

      expect(result).toBe(storedToken);
    });

    it('should reject an unknown refresh token', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.validate(token)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(refreshTokenRepository.updateLastUsed).not.toHaveBeenCalled();
    });

    it('should reject a revoked refresh token', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue({
        ...storedToken,
        revokedAt: new Date(),
      });

      await expect(service.validate(token)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(refreshTokenRepository.updateLastUsed).not.toHaveBeenCalled();
    });

    it('should reject an expired refresh token', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue({
        ...storedToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.validate(token)).rejects.toThrow(
        new UnauthorizedException('Invalid refresh token'),
      );

      expect(refreshTokenRepository.updateLastUsed).not.toHaveBeenCalled();
    });
  });

  describe('revoke', () => {
    it('should revoke an existing refresh token', async () => {
      const storedToken = {
        id: 'refresh-token-id',
        userId: 'user-id',
        tokenHash: 'hashed-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
        revokedAt: null,
        lastUsedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      refreshTokenRepository.findByTokenHash.mockResolvedValue(storedToken);

      refreshTokenRepository.revoke.mockResolvedValue(storedToken);

      await service.revoke('refresh-token');

      expect(refreshTokenRepository.findByTokenHash).toHaveBeenCalledWith(
        expect.any(String),
      );

      expect(refreshTokenRepository.revoke).toHaveBeenCalledWith(
        storedToken.id,
      );
    });

    it('should do nothing when the refresh token does not exist', async () => {
      refreshTokenRepository.findByTokenHash.mockResolvedValue(null);

      await expect(service.revoke('refresh-token')).resolves.toBeUndefined();

      expect(refreshTokenRepository.revoke).not.toHaveBeenCalled();
    });
  });
});
