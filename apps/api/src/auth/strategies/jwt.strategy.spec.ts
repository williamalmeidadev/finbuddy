import { JwtStrategy } from './jwt.strategy';
import { UserRepository } from '../../user/user.repository';
import { UserStatus } from '../../generated/prisma/enums';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let userRepository: jest.Mocked<UserRepository>;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';

    userRepository = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;

    strategy = new JwtStrategy(userRepository);
  });

  describe('validate', () => {
    it('should return the authenticated user from the JWT payload when user is active', async () => {
      const payload = {
        sub: 'user-id',
        email: 'test@finbuddy.dev',
      };

      userRepository.findById.mockResolvedValue({
        id: 'user-id',
        email: 'test@finbuddy.dev',
        status: UserStatus.ACTIVE,
      } as any);

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        id: 'user-id',
        email: 'test@finbuddy.dev',
      });
    });

    it('should throw UnauthorizedException when user is inactive or missing', async () => {
      const payload = {
        sub: 'user-id',
        email: 'test@finbuddy.dev',
      };

      userRepository.findById.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow();
    });
  });
});
