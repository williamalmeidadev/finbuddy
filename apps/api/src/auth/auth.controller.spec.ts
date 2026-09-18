import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Request, Response } from 'express';

describe('AuthController', () => {
  let controller: AuthController;

  let authService: {
    login: jest.Mock;
    refresh: jest.Mock;
    me: jest.Mock;
    logout: jest.Mock;
  };

  let res: Partial<Response>;

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      me: jest.fn(),
      logout: jest.fn(),
    };

    res = {
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  describe('login', () => {
    it('should login a user and set refresh cookie', async () => {
      const dto = { email: 'test@finbuddy.dev', password: '12345678' };
      const serviceResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'user-id', email: dto.email },
      };

      authService.login.mockResolvedValue(serviceResult);

      const result = await controller.login(dto, res as Response);

      expect(authService.login).toHaveBeenCalledWith(dto.email, dto.password);
      expect(res.cookie).toHaveBeenCalledWith(
        'finbuddy_rt',
        'refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/auth',
        }),
      );
      expect(result).toEqual({
        accessToken: 'access-token',
        user: serviceResult.user,
      });
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should propagate service errors', async () => {
      const dto = { email: 'test@finbuddy.dev', password: 'wrong-password' };
      authService.login.mockRejectedValue(new Error('Invalid credentials'));
      await expect(controller.login(dto, res as Response)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('refresh', () => {
    it('should refresh token from cookie and set new cookie', async () => {
      const req = {
        cookies: { finbuddy_rt: 'old-refresh-token' },
      } as unknown as Request;
      const serviceResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: { id: 'user-id', email: 'test@finbuddy.dev' },
      };

      authService.refresh.mockResolvedValue(serviceResult);

      const result = await controller.refresh(req, res as Response);

      expect(authService.refresh).toHaveBeenCalledWith('old-refresh-token');
      expect(res.cookie).toHaveBeenCalledWith(
        'finbuddy_rt',
        'new-refresh-token',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/auth',
        }),
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        user: serviceResult.user,
      });
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should propagate service errors on refresh', async () => {
      const req = {
        cookies: { finbuddy_rt: 'invalid-token' },
      } as unknown as Request;
      authService.refresh.mockRejectedValue(new Error('Invalid refresh token'));
      await expect(controller.refresh(req, res as Response)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('logout', () => {
    it('should revoke token from cookie and clear cookie', async () => {
      const req = {
        cookies: { finbuddy_rt: 'refresh-token' },
      } as unknown as Request;
      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(req, res as Response);

      expect(authService.logout).toHaveBeenCalledWith('refresh-token');
      expect(res.clearCookie).toHaveBeenCalledWith(
        'finbuddy_rt',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
          path: '/auth',
        }),
      );
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should clear cookie and return success even with no cookie present', async () => {
      const req = { cookies: {} } as unknown as Request;

      const result = await controller.logout(req, res as Response);

      expect(authService.logout).not.toHaveBeenCalled();
      expect(res.clearCookie).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should propagate service errors on logout', async () => {
      const req = {
        cookies: { finbuddy_rt: 'invalid-token' },
      } as unknown as Request;
      authService.logout.mockRejectedValue(new Error('Some error'));
      await expect(controller.logout(req, res as Response)).rejects.toThrow(
        'Some error',
      );
    });
  });

  describe('me', () => {
    it('should call authService.me and return the user', async () => {
      const user = { id: 'user-id', email: 'test@finbuddy.dev' };
      const response = {
        id: 'user-id',
        email: 'test@finbuddy.dev',
        status: 'ACTIVE',
      };
      authService.me.mockResolvedValue(response);
      const result = await controller.me(user);
      expect(authService.me).toHaveBeenCalledWith(user.id);
      expect(result).toEqual(response);
    });

    it('should propagate service errors', async () => {
      const user = { id: 'user-id', email: 'test@finbuddy.dev' };
      authService.me.mockRejectedValue(new Error('User no longer exists'));
      await expect(controller.me(user)).rejects.toThrow(
        'User no longer exists',
      );
    });
  });
});
