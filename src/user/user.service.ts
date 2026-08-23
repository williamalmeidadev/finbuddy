import {
    ConflictException,
    Injectable,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PasswordService } from '../auth/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
    constructor(
        private readonly userRepository: UserRepository,
        private readonly passwordService: PasswordService,
    ) { }

    async create(dto: CreateUserDto): Promise<UserResponseDto> {
        const email = dto.email.trim().toLowerCase();

        const passwordHash = await this.passwordService.hash(dto.password);

        try {
            const user = await this.userRepository.create({
                email,
                passwordHash,
            });

            return new UserResponseDto(user);
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                throw new ConflictException('Email already exists');
            }

            throw error;
        }
    }

    async findById(id: string) {
        return this.userRepository.findById(id);
    }

    async findByEmail(email: string) {
        const normalizedEmail = email.trim().toLowerCase();

        return this.userRepository.findByEmail(normalizedEmail);
    }
}