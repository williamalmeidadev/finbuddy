import { RefreshTokenRepository } from './refresh-token.repository';
import { PrismaService } from '../prisma/prisma.service';

describe('RefreshTokenRepository', () => {
  let repository: RefreshTokenRepository;

  let prisma: {
    refreshToken: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    repository = new RefreshTokenRepository(prisma as unknown as PrismaService);
  });

  describe('create', () => {
    it('should create a refresh token', async () => {
      const data = {
        userId: 'user-id',
        tokenHash: 'token-hash',
        expiresAt: new Date(),
      };

      const refreshToken = {
        id: 'token-id',
        ...data,
      };

      prisma.refreshToken.create.mockResolvedValue(refreshToken);

      const result = await repository.create(data);

      expect(prisma.refreshToken.create).toHaveBeenCalledWith({
        data,
      });

      expect(result).toBe(refreshToken);
    });
  });

  describe('findByTokenHash', () => {
    it('should find a refresh token by hash', async () => {
      const refreshToken = {
        id: 'token-id',
        userId: 'user-id',
        tokenHash: 'token-hash',
      };

      prisma.refreshToken.findUnique.mockResolvedValue(refreshToken);

      const result = await repository.findByTokenHash('token-hash');

      expect(prisma.refreshToken.findUnique).toHaveBeenCalledWith({
        where: {
          tokenHash: 'token-hash',
        },
      });

      expect(result).toBe(refreshToken);
    });

    it('should return null when token does not exist', async () => {
      prisma.refreshToken.findUnique.mockResolvedValue(null);

      const result = await repository.findByTokenHash('unknown-hash');

      expect(result).toBeNull();
    });
  });

  describe('revoke', () => {
    it('should revoke a refresh token', async () => {
      const refreshToken = {
        id: 'token-id',
        revokedAt: new Date(),
      };

      prisma.refreshToken.update.mockResolvedValue(refreshToken);

      const result = await repository.revoke('token-id');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: {
          id: 'token-id',
        },
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
        }),
      });

      expect(result).toBe(refreshToken);
    });
  });

  describe('updateLastUsed', () => {
    it('should update the last used timestamp', async () => {
      const refreshToken = {
        id: 'token-id',
        lastUsedAt: new Date(),
      };

      prisma.refreshToken.update.mockResolvedValue(refreshToken);

      const result = await repository.updateLastUsed('token-id');

      expect(prisma.refreshToken.update).toHaveBeenCalledWith({
        where: {
          id: 'token-id',
        },
        data: expect.objectContaining({
          lastUsedAt: expect.any(Date),
        }),
      });

      expect(result).toBe(refreshToken);
    });
  });
});
