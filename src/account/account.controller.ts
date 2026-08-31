import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountService } from './account.service';
import { AccountResponseDto } from './dto/account-response.dto';

@UseGuards(JwtAuthGuard)
@Controller('accounts')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateAccountDto,
  ): Promise<AccountResponseDto> {
    return this.accountService.create(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUserDto,
  ): Promise<AccountResponseDto[]> {
    return this.accountService.findByUserId(user.id);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id') id: string,
  ): Promise<AccountResponseDto> {
    return this.accountService.findById(id, user.id);
  }
}
