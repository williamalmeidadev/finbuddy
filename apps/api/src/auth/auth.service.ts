import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { UserRepository } from '../user/user.repository';
import { PasswordService } from '../password/password.service';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { RefreshTokenService } from './refresh-token.service';
import { UserStatus } from '../generated/prisma/enums';
import {
  isValidEmail,
  sanitizeEmail,
  sanitizeString,
} from '../common/utils/input-sanitizer.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = sanitizeEmail(email) as string;

    if (!isValidEmail(normalizedEmail)) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const cleanPassword = sanitizeString(password) as string;

    const user = await this.userRepository.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(
      user.passwordHash,
      cleanPassword,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`User is ${user.status.toLowerCase()}`);
    }

    const updatedUser = await this.userRepository
      .update(user.id, {
        lastLoginAt: new Date(),
      })
      .catch(() => user);

    const accessToken = await this.generateAccessToken(
      updatedUser.id,
      updatedUser.email,
    );

    const refreshToken = await this.refreshTokenService.create(updatedUser.id);

    return {
      accessToken,
      refreshToken,
      user: new UserResponseDto(updatedUser),
    };
  }

  async refresh(refreshToken: string) {
    const storedToken = await this.refreshTokenService.validate(refreshToken);

    const user = await this.userRepository.findById(storedToken.userId);

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`User is ${user.status.toLowerCase()}`);
    }

    await this.refreshTokenService.revoke(refreshToken);

    const accessToken = await this.generateAccessToken(user.id, user.email);

    const newRefreshToken = await this.refreshTokenService.create(user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: new UserResponseDto(user),
    };
  }

  async me(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`User is ${user.status.toLowerCase()}`);
    }

    return new UserResponseDto(user);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.refreshTokenService.revoke(refreshToken);
  }

  private async generateAccessToken(
    userId: string,
    email: string,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: userId,
      email,
      jti: randomUUID(),
    });
  }
}
