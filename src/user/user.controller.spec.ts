import { UserResponseDto } from './dto/user-response.dto';
import { UserService } from './user.service';
import { UserController } from './user.controller';

describe('UserController', () => {
    let controller: UserController;

    let userService: {
        create: jest.Mock;
        findById: jest.Mock;
    };

    beforeEach(() => {
        userService = {
            create: jest.fn(),
            findById: jest.fn(),
        };

        controller = new UserController(
            userService as unknown as UserService,
        );
    });

    describe('create', () => {
        it('should propagate service errors', async () => {
            const dto = {
                email: 'test@finbuddy.dev',
                password: '12345678',
            };

            const error = new Error('Email already exists');

            userService.create.mockRejectedValue(error);

            await expect(
                controller.create(dto),
            ).rejects.toThrow(error);

            expect(userService.create).toHaveBeenCalledWith(dto);
        });

        it('should create a user', async () => {
            const dto = {
                email: 'test@finbuddy.dev',
                password: '12345678',
            };

            const response = new UserResponseDto({
                id: 'user-id',
                email: dto.email,
                passwordHash: 'hashed-password',
                status: 'ACTIVE',
                emailVerifiedAt: null,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            userService.create.mockResolvedValue(response);

            const result = await controller.create(dto);

            expect(userService.create).toHaveBeenCalledWith(dto);
            expect(result).toBe(response);
        });
    });

    describe('findById', () => {
        it('should find a user by id', async () => {
            const userId = 'user-id';

            const response = new UserResponseDto({
                id: userId,
                email: 'test@finbuddy.dev',
                passwordHash: 'hashed-password',
                status: 'ACTIVE',
                emailVerifiedAt: null,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            userService.findById.mockResolvedValue(response);

            const result = await controller.findById(userId);

            expect(userService.findById).toHaveBeenCalledWith(userId);
            expect(result).toBe(response);
        });

        it('should propagate service errors', async () => {
            const userId = 'user-id';
            const error = new Error('User not found');

            userService.findById.mockRejectedValue(error);

            await expect(
                controller.findById(userId),
            ).rejects.toThrow(error);

            expect(userService.findById).toHaveBeenCalledWith(userId);
        });
    });
});