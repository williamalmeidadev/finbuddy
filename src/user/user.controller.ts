import {
    Body,
    Controller,
    Get,
    Param,
    Post,
} from '@nestjs/common';

import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CreateUserDto } from './dto/create-user.dto';
import { UserService } from './user.service';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    create(@Body() dto: CreateUserDto) {
        return this.userService.create(dto);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    async findById(@Param('id') id: string) {
        return this.userService.findById(id);
    }
}