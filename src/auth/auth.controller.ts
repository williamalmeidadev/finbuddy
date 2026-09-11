import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthenticatedUserDto } from './dto/authenticated-user.dto';
import { UserResponseDto } from '../user/dto/user-response.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({
    status: 201,
    description: 'User successfully authenticated and JWT tokens issued',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
  @ApiResponse({
    status: 200,
    description: 'New access token and rotated refresh token issued',
  })
  @ApiResponse({ status: 401, description: 'Invalid or revoked refresh token' })
  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Logout and revoke refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Refresh token revoked successfully',
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() dto: RefreshDto) {
    await this.authService.logout(dto.refreshToken);
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
