import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';

import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUserDto } from './dto/authenticated-user.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';

const COOKIE_NAME = 'finbuddy_rt';
const COOKIE_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth',
    maxAge: COOKIE_MAX_AGE_MS,
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth',
  });
}

@ApiTags('Auth')
@ApiResponse({
  status: 429,
  description: 'Too Many Requests - Rate limit exceeded',
})
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({
    status: 201,
    description:
      'User successfully authenticated; refresh token set as HttpOnly cookie',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @Throttle({
    auth: {
      ttl: Number(process.env.THROTTLE_TTL || 60000),
      limit: Number(process.env.THROTTLE_AUTH_LIMIT || 10),
    },
  })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, user } = await this.authService.login(
      dto.email,
      dto.password,
    );
    setRefreshCookie(res, refreshToken);
    return { accessToken, user };
  }

  @ApiOperation({
    summary: 'Refresh access token using HttpOnly cookie refresh token',
  })
  @ApiResponse({
    status: 200,
    description: 'New access token issued; refresh token cookie rotated',
  })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  @Throttle({
    auth: {
      ttl: Number(process.env.THROTTLE_TTL || 60000),
      limit: Number(process.env.THROTTLE_AUTH_LIMIT || 10),
    },
  })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken: string = req.cookies?.[COOKIE_NAME] ?? '';
    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await this.authService.refresh(refreshToken);
    setRefreshCookie(res, newRefreshToken);
    return { accessToken, user };
  }

  @ApiOperation({ summary: 'Logout and revoke refresh token cookie' })
  @ApiResponse({
    status: 200,
    description: 'Refresh token revoked and cookie cleared',
  })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken: string = req.cookies?.[COOKIE_NAME] ?? '';
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    clearRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }

  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Profile details of current authenticated user',
    type: UserResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUserDto) {
    return this.authService.me(user.id);
  }
}
