import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { Prisma } from '../generated/prisma/client';
import { PasswordService } from '../password/password.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRepository } from './user.repository';
import { UserStatus } from '../generated/prisma/enums';
import {
  isValidEmail,
  sanitizeEmail,
  sanitizeString,
} from '../common/utils/input-sanitizer.util';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const email = sanitizeEmail(dto.email) as string;

    if (!isValidEmail(email)) {
      throw new BadRequestException('Invalid email address format');
    }

    const cleanPassword = sanitizeString(dto.password) as string;
    const passwordHash = await this.passwordService.hash(cleanPassword);

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

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`User is ${user.status.toLowerCase()}`);
    }

    return new UserResponseDto(user);
  }

  async findByEmail(email: string): Promise<UserResponseDto | null> {
    const normalizedEmail = sanitizeEmail(email) as string;

    if (!isValidEmail(normalizedEmail)) {
      return null;
    }

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      return null;
    }

    return new UserResponseDto(user);
  }
}
