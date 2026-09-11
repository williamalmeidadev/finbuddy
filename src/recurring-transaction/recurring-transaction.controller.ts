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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { RecurringTransactionQueryDto } from './dto/recurring-transaction-query.dto';
import { RecurringTransactionResponseDto } from './dto/recurring-transaction-response.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import { RecurringTransactionService } from './recurring-transaction.service';

@ApiTags('Recurring Transactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('recurring-transactions')
export class RecurringTransactionController {
  constructor(private readonly service: RecurringTransactionService) {}

  @ApiOperation({ summary: 'Create a new recurring transaction rule' })
  @ApiResponse({
    status: 201,
    description: 'Recurring transaction rule created successfully',
    type: RecurringTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Account or category not found' })
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    return this.service.create(user.id, dto);
  }

  @ApiOperation({
    summary: 'Get all recurring transaction rules for authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'List of user recurring transaction rules',
    type: [RecurringTransactionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: RecurringTransactionQueryDto,
  ): Promise<RecurringTransactionResponseDto[]> {
    return this.service.findByUserId(user.id, query);
  }

  @ApiOperation({ summary: 'Get recurring transaction rule by ID' })
  @ApiParam({
    name: 'id',
    description: 'Recurring transaction UUID',
    example: 'r1e2c3u4-r5r6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Recurring transaction rule details',
    type: RecurringTransactionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Recurring transaction rule not found',
  })
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecurringTransactionResponseDto> {
    return this.service.findById(id, user.id);
  }

  @ApiOperation({ summary: 'Update recurring transaction rule' })
  @ApiParam({
    name: 'id',
    description: 'Recurring transaction UUID',
    example: 'r1e2c3u4-r5r6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Recurring transaction rule updated successfully',
    type: RecurringTransactionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Recurring transaction rule not found',
  })
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    return this.service.update(id, user.id, dto);
  }

  @ApiOperation({ summary: 'Deactivate recurring transaction rule' })
  @ApiParam({
    name: 'id',
    description: 'Recurring transaction UUID',
    example: 'r1e2c3u4-r5r6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Recurring transaction rule deactivated successfully',
    type: RecurringTransactionResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Recurring transaction rule not found',
  })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RecurringTransactionResponseDto> {
    return this.service.deactivate(id, user.id);
  }
}
