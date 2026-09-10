import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionService } from './transaction.service';

@UseGuards(JwtAuthGuard)
@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionService.create(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: TransactionQueryDto,
  ): Promise<TransactionResponseDto[]> {
    return this.transactionService.findByUserId(user.id, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionService.findById(id, user.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    return this.transactionService.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionResponseDto> {
    return this.transactionService.delete(id, user.id);
  }
}
