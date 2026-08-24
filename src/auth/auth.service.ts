import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';

import { UserRepository } from '../user/user.repository';
import { PasswordService } from '../password/password.service';
import { UserResponseDto } from '../user/dto/user-response.dto';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async login(email: string, password: string) {
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(
      normalizedEmail,
    );

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(
      user.passwordHash,
      password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = await this.generateAccessToken(
      user.id,
      user.email,
    );

    const refreshToken = await this.refreshTokenService.create(
      user.id,
    );

    return {
      accessToken,
      refreshToken,
      user: new UserResponseDto(user),
    };
  }

  async refresh(refreshToken: string) {
    const storedToken =
      await this.refreshTokenService.validate(refreshToken);

    const user = await this.userRepository.findById(
      storedToken.userId,
    );

    if (!user) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    await this.refreshTokenService.revoke(refreshToken);

    const accessToken = await this.generateAccessToken(
      user.id,
      user.email,
    );

    const newRefreshToken =
      await this.refreshTokenService.create(user.id);

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

    return new UserResponseDto(user);
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