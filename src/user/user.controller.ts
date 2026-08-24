import { Body, Controller, ForbiddenException, Get, Param, Post } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUserDto,
  ) {
    if (user.id !== id) {
      throw new ForbiddenException('You can only access your own profile');
    }
    return this.userService.findById(id);
  }
}
