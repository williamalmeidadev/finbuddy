import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  let authService: {
    login: jest.Mock;
    refresh: jest.Mock;
    me: jest.Mock;
    logout: jest.Mock;
  };

  beforeEach(() => {
    authService = {
      login: jest.fn(),
      refresh: jest.fn(),
      me: jest.fn(),
      logout: jest.fn(),
    };

    controller = new AuthController(authService as unknown as AuthService);
  });

  describe('login', () => {
    it('should login a user', async () => {
      const dto = {
        email: 'test@finbuddy.dev',
        password: '12345678',
      };

      const user = {
        id: 'user-id',
        email: dto.email,
      };

      authService.login.mockResolvedValue(user);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto.email, dto.password);

      expect(result).toEqual(user);
    });

    it('should propagate service errors', async () => {
      const dto = {
        email: 'test@finbuddy.dev',
        password: 'wrong-password',
      };

      authService.login.mockRejectedValue(new Error('Invalid credentials'));

      await expect(controller.login(dto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('refresh', () => {
    it('should refresh a token', async () => {
      const dto = {
        refreshToken: 'refresh-token',
      };

      const response = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authService.refresh.mockResolvedValue(response);

      const result = await controller.refresh(dto);

      expect(authService.refresh).toHaveBeenCalledWith(dto.refreshToken);
      expect(result).toEqual(response);
    });

    it('should propagate service errors on refresh', async () => {
      const dto = {
        refreshToken: 'invalid-token',
      };

      authService.refresh.mockRejectedValue(new Error('Invalid refresh token'));

      await expect(controller.refresh(dto)).rejects.toThrow(
        'Invalid refresh token',
      );
    });
  });

  describe('me', () => {
    it('should call authService.me and return the user', async () => {
      const user = {
        id: 'user-id',
        email: 'test@finbuddy.dev',
      };

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
      const user = {
        id: 'user-id',
        email: 'test@finbuddy.dev',
      };

      authService.me.mockRejectedValue(new Error('User no longer exists'));

      await expect(controller.me(user)).rejects.toThrow(
        'User no longer exists',
      );
    });
  });

  describe('logout', () => {
    it('should logout a user and revoke refresh token', async () => {
      const dto = {
        refreshToken: 'refresh-token',
      };

      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(dto);

      expect(authService.logout).toHaveBeenCalledWith(dto.refreshToken);
      expect(result).toEqual({ message: 'Logged out successfully' });
    });

    it('should propagate service errors on logout', async () => {
      const dto = {
        refreshToken: 'invalid-token',
      };

      authService.logout.mockRejectedValue(new Error('Some error'));

      await expect(controller.logout(dto)).rejects.toThrow('Some error');
    });
  });
});
