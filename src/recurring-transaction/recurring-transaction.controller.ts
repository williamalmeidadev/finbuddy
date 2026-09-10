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
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { RecurringTransactionQueryDto } from './dto/recurring-transaction-query.dto';
import { RecurringTransactionResponseDto } from './dto/recurring-transaction-response.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import { RecurringTransactionService } from './recurring-transaction.service';

@UseGuards(JwtAuthGuard)
@Controller('recurring-transactions')
export class RecurringTransactionController {
  constructor(
    private readonly service: RecurringTransactionService,
  ) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    return this.service.create(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: RecurringTransactionQueryDto,
  ): Promise<RecurringTransactionResponseDto[]> {
    return this.service.findByUserId(user.id, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecurringTransactionResponseDto> {
    return this.service.findById(id, user.id);
  }

  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    return this.service.update(id, user.id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecurringTransactionResponseDto> {
    return this.service.deactivate(id, user.id);
  }
}
