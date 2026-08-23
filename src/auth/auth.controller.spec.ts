import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
    let controller: AuthController;

    let authService: {
        login: jest.Mock;
    };

    beforeEach(() => {
        authService = {
            login: jest.fn(),
        };

        controller = new AuthController(
            authService as unknown as AuthService,
        );
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

            expect(authService.login).toHaveBeenCalledWith(
                dto.email,
                dto.password,
            );

            expect(result).toEqual(user);
        });

        it('should propagate service errors', async () => {
            const dto = {
                email: 'test@finbuddy.dev',
                password: 'wrong-password',
            };

            authService.login.mockRejectedValue(
                new Error('Invalid credentials'),
            );

            await expect(
                controller.login(dto),
            ).rejects.toThrow('Invalid credentials');
        });
    });
});