import { UserStatus } from '../generated/prisma/enums';
import { PasswordService } from '../auth/password.service';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';
import {
    ConflictException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';

describe('UserService', () => {
    let service: UserService;

    let userRepository: {
        create: jest.Mock;
        findById: jest.Mock;
        findByEmail: jest.Mock;
    };

    let passwordService: {
        hash: jest.Mock;
    };

    beforeEach(() => {
        userRepository = {
            create: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
        };

        passwordService = {
            hash: jest.fn(),
        };

        service = new UserService(
            userRepository as unknown as UserRepository,
            passwordService as unknown as PasswordService,
        );
    });

    describe('create', () => {
        it('should create a user with a hashed password', async () => {
            const dto = {
                email: 'test@finbuddy.dev',
                password: '12345678',
            };

            const passwordHash = 'hashed-password';

            const user = {
                id: 'user-id',
                email: dto.email,
                passwordHash,
                status: UserStatus.ACTIVE,
                emailVerifiedAt: null,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            passwordService.hash.mockResolvedValue(passwordHash);
            userRepository.create.mockResolvedValue(user);

            const result = await service.create(dto);

            expect(passwordService.hash).toHaveBeenCalledWith(dto.password);

            expect(userRepository.create).toHaveBeenCalledWith({
                email: dto.email,
                passwordHash,
            });

            expect(result).toBeInstanceOf(UserResponseDto);
            expect(result.email).toBe(dto.email);
            expect(result.id).toBe(user.id);
            expect(result.status).toBe(UserStatus.ACTIVE);

            expect(result).not.toHaveProperty('passwordHash');
        });

        it('should not store the plain password', async () => {
            const dto = {
                email: 'test@finbuddy.dev',
                password: '12345678',
            };

            const passwordHash = 'hashed-password';

            passwordService.hash.mockResolvedValue(passwordHash);

            userRepository.create.mockResolvedValue({
                id: 'user-id',
                email: dto.email,
                passwordHash,
                status: UserStatus.ACTIVE,
                emailVerifiedAt: null,
                lastLoginAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            await service.create(dto);

            expect(userRepository.create).not.toHaveBeenCalledWith(
                expect.objectContaining({
                    password: dto.password,
                }),
            );
        }),

            it('should throw ConflictException when email already exists', async () => {
                const dto = {
                    email: 'test@finbuddy.dev',
                    password: '12345678',
                };

                const passwordHash = 'hashed-password';

                passwordService.hash.mockResolvedValue(passwordHash);

                userRepository.create.mockRejectedValue(
                    new Prisma.PrismaClientKnownRequestError(
                        'Unique constraint failed',
                        {
                            code: 'P2002',
                            clientVersion: '7.9.1',
                        },
                    ),
                );

                await expect(service.create(dto)).rejects.toThrow(
                    ConflictException,
                );

                expect(userRepository.create).toHaveBeenCalledWith({
                    email: dto.email,
                    passwordHash,
                });
            });
    });

    describe('findById', () => {
        it('should return the user found by id', async () => {
            const user = {
                id: 'user-id',
            };

            userRepository.findById.mockResolvedValue(user);

            const result = await service.findById(user.id);

            expect(userRepository.findById).toHaveBeenCalledWith(user.id);
            expect(result).toEqual(user);
        });
    });

    describe('findByEmail', () => {
        it('should return the user found by email', async () => {
            const email = 'test@finbuddy.dev';

            const user = {
                id: 'user-id',
                email,
            };

            userRepository.findByEmail.mockResolvedValue(user);

            const result = await service.findByEmail(email);

            expect(userRepository.findByEmail).toHaveBeenCalledWith(email);
            expect(result).toEqual(user);
        });
    });
});