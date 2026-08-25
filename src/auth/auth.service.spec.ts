import { JwtService } from '@nestjs/jwt';

import { PasswordService } from '../password/password.service';
import { UserRepository } from '../user/user.repository';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';

describe('AuthService', () => {
  let service: AuthService;

  let userRepository: {
    findByEmail: jest.Mock;
    findById: jest.Mock;
  };

  let passwordService: {
    verify: jest.Mock;
  };

  let jwtService: {
    signAsync: jest.Mock;
  };

  let refreshTokenService: {
    create: jest.Mock;
    validate: jest.Mock;
    revoke: jest.Mock;
  };

  beforeEach(() => {
    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
    };

    passwordService = {
      verify: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('access-token'),
    };

    refreshTokenService = {
      create: jest.fn().mockResolvedValue('refresh-token'),
      validate: jest.fn(),
      revoke: jest.fn(),
    };

    service = new AuthService(
      userRepository as unknown as UserRepository,
      passwordService as unknown as PasswordService,
      jwtService as unknown as JwtService,
      refreshTokenService as unknown as RefreshTokenService,
    );
  });

  describe('login', () => {
    const user = {
      id: 'user-id',
      email: 'test@finbuddy.dev',
      passwordHash: 'hashed-password',
    };

    beforeEach(() => {
      userRepository.findByEmail.mockResolvedValue(user);

      passwordService.verify.mockResolvedValue(true);
    });

    it('should find the user by email', async () => {
      const result = await service.login(user.email, '12345678');

      expect(userRepository.findByEmail).toHaveBeenCalledWith(user.email);

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: expect.objectContaining({
          id: user.id,
          email: user.email,
        }),
      });

      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException when user is not found', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login('nonexistent@finbuddy.dev', '12345678'),
      ).rejects.toThrow('Invalid credentials');

      expect(passwordService.verify).not.toHaveBeenCalled();

      expect(jwtService.signAsync).not.toHaveBeenCalled();

      expect(refreshTokenService.create).not.toHaveBeenCalled();
    });

    it('should verify the password', async () => {
      await service.login(user.email, '12345678');

      expect(passwordService.verify).toHaveBeenCalledWith(
        user.passwordHash,
        '12345678',
      );
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      passwordService.verify.mockResolvedValue(false);

      await expect(service.login(user.email, 'wrong-password')).rejects.toThrow(
        'Invalid credentials',
      );

      expect(jwtService.signAsync).not.toHaveBeenCalled();

      expect(refreshTokenService.create).not.toHaveBeenCalled();
    });

    it('should normalize the email before searching', async () => {
      await service.login('  Test@FinBuddy.Dev  ', '12345678');

      expect(userRepository.findByEmail).toHaveBeenCalledWith(
        'test@finbuddy.dev',
      );
    });

    it('should generate an access token', async () => {
      await service.login(user.email, '12345678');

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        jti: expect.any(String),
      });
    });

    it('should create a refresh token', async () => {
      const result = await service.login(user.email, '12345678');

      expect(refreshTokenService.create).toHaveBeenCalledWith(user.id);

      expect(result.refreshToken).toBe('refresh-token');
    });
  });

  describe('refresh', () => {
    const refreshToken = 'refresh-token';

    const user = {
      id: 'user-id',
      email: 'test@finbuddy.dev',
      passwordHash: 'hashed-password',
    };

    const storedToken = {
      id: 'refresh-token-id',
      userId: user.id,
      tokenHash: 'hashed-refresh-token',
      expiresAt: new Date(Date.now() + 86400000),
      revokedAt: null,
      lastUsedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      refreshTokenService.validate.mockResolvedValue(storedToken);

      refreshTokenService.create.mockResolvedValue('new-refresh-token');

      refreshTokenService.revoke.mockResolvedValue(undefined);

      userRepository.findById.mockResolvedValue(user);
    });

    it('should refresh the tokens', async () => {
      const result = await service.refresh(refreshToken);

      expect(refreshTokenService.validate).toHaveBeenCalledWith(refreshToken);

      expect(userRepository.findById).toHaveBeenCalledWith(user.id);

      expect(refreshTokenService.revoke).toHaveBeenCalledWith(refreshToken);

      expect(refreshTokenService.create).toHaveBeenCalledWith(user.id);

      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: user.id,
        email: user.email,
        jti: expect.any(String),
      });

      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'new-refresh-token',
        user: expect.objectContaining({
          id: user.id,
          email: user.email,
        }),
      });

      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should reject an invalid refresh token', async () => {
      refreshTokenService.validate.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(userRepository.findById).not.toHaveBeenCalled();

      expect(refreshTokenService.revoke).not.toHaveBeenCalled();

      expect(refreshTokenService.create).not.toHaveBeenCalled();

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should reject an expired refresh token', async () => {
      refreshTokenService.validate.mockRejectedValue(
        new Error('Invalid refresh token'),
      );

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(userRepository.findById).not.toHaveBeenCalled();

      expect(refreshTokenService.revoke).not.toHaveBeenCalled();

      expect(refreshTokenService.create).not.toHaveBeenCalled();

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });

    it('should reject when the user no longer exists', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.refresh(refreshToken)).rejects.toThrow(
        'Invalid refresh token',
      );

      expect(refreshTokenService.validate).toHaveBeenCalledWith(refreshToken);

      expect(refreshTokenService.revoke).not.toHaveBeenCalled();

      expect(refreshTokenService.create).not.toHaveBeenCalled();

      expect(jwtService.signAsync).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    const userId = 'user-id';
    const user = {
      id: userId,
      email: 'test@finbuddy.dev',
      passwordHash: 'hashed-password',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should return the authenticated user', async () => {
      userRepository.findById.mockResolvedValue(user);

      const result = await service.me(userId);

      expect(userRepository.findById).toHaveBeenCalledWith(userId);
      expect(result).toEqual(
        expect.objectContaining({
          id: user.id,
          email: user.email,
        }),
      );
    });

    it('should not expose passwordHash', async () => {
      userRepository.findById.mockResolvedValue(user);

      const result = await service.me(userId);

      expect(result).not.toHaveProperty('passwordHash');
    });

    it('should reject when the user no longer exists', async () => {
      userRepository.findById.mockResolvedValue(null);

      await expect(service.me(userId)).rejects.toThrow('User no longer exists');
    });
  });
});
