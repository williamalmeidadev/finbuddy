import { JwtService } from '@nestjs/jwt';

import { PasswordService } from './password.service';
import { UserRepository } from '../user/user.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
    let service: AuthService;

    let userRepository: {
        findByEmail: jest.Mock;
    };

    let passwordService: {
        verify: jest.Mock;
    };

    let jwtService: {
        signAsync: jest.Mock;
    };

    beforeEach(() => {
        userRepository = {
            findByEmail: jest.fn(),
        };

        passwordService = {
            verify: jest.fn(),
        };

        jwtService = {
            signAsync: jest.fn().mockResolvedValue('access-token'),
        };

        service = new AuthService(
            userRepository as unknown as UserRepository,
            passwordService as unknown as PasswordService,
            jwtService as unknown as JwtService,
        );
    });

    describe('login', () => {
        it('should find the user by email', async () => {
            const email = 'test@finbuddy.dev';

            const user = {
                id: 'user-id',
                email,
                passwordHash: 'hashed-password',
            };

            userRepository.findByEmail.mockResolvedValue(user);
            passwordService.verify.mockResolvedValue(true);

            const result = await service.login(email, '12345678');

            expect(userRepository.findByEmail).toHaveBeenCalledWith(email);

            expect(result).toEqual({
                user: expect.objectContaining({
                    id: user.id,
                    email: user.email,
                }),
                accessToken: 'access-token',
            });

            expect(result.user).not.toHaveProperty('passwordHash');
        });

        it('should throw UnauthorizedException when user is not found', async () => {
            userRepository.findByEmail.mockResolvedValue(null);

            await expect(
                service.login(
                    'nonexistent@finbuddy.dev',
                    '12345678',
                ),
            ).rejects.toThrow('Invalid credentials');

            expect(passwordService.verify).not.toHaveBeenCalled();
            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });

        it('should verify the password', async () => {
            const user = {
                id: 'user-id',
                email: 'test@finbuddy.dev',
                passwordHash: 'hashed-password',
            };

            userRepository.findByEmail.mockResolvedValue(user);
            passwordService.verify.mockResolvedValue(true);

            await service.login(
                user.email,
                '12345678',
            );

            expect(passwordService.verify).toHaveBeenCalledWith(
                user.passwordHash,
                '12345678',
            );
        });

        it('should throw UnauthorizedException when password is invalid', async () => {
            const user = {
                id: 'user-id',
                email: 'test@finbuddy.dev',
                passwordHash: 'hashed-password',
            };

            userRepository.findByEmail.mockResolvedValue(user);
            passwordService.verify.mockResolvedValue(false);

            await expect(
                service.login(
                    user.email,
                    'wrong-password',
                ),
            ).rejects.toThrow('Invalid credentials');

            expect(jwtService.signAsync).not.toHaveBeenCalled();
        });

        it('should normalize the email before searching', async () => {
            const user = {
                id: 'user-id',
                email: 'test@finbuddy.dev',
                passwordHash: 'hashed-password',
            };

            userRepository.findByEmail.mockResolvedValue(user);
            passwordService.verify.mockResolvedValue(true);

            await service.login(
                '  Test@FinBuddy.Dev  ',
                '12345678',
            );

            expect(userRepository.findByEmail).toHaveBeenCalledWith(
                'test@finbuddy.dev',
            );
        });

        it('should generate an access token', async () => {
            const user = {
                id: 'user-id',
                email: 'test@finbuddy.dev',
                passwordHash: 'hashed-password',
            };

            userRepository.findByEmail.mockResolvedValue(user);
            passwordService.verify.mockResolvedValue(true);

            await service.login(
                user.email,
                '12345678',
            );

            expect(jwtService.signAsync).toHaveBeenCalledWith({
                sub: user.id,
                email: user.email,
            });
        });
    });
});