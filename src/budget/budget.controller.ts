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
import { BudgetService } from './budget.service';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { BudgetResponseDto } from './dto/budget-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@ApiTags('Budgets')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 429,
  description: 'Too Many Requests - Rate limit exceeded',
})
@UseGuards(JwtAuthGuard)
@Controller('budgets')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @ApiOperation({ summary: 'Create a new category budget limit' })
  @ApiResponse({
    status: 201,
    description: 'Budget created successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 409,
    description: 'Budget for this category and month already exists',
  })
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.create(user.id, dto);
  }

  @ApiOperation({ summary: 'Get all budgets for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of user budgets',
    type: [BudgetResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: BudgetQueryDto,
  ): Promise<BudgetResponseDto[]> {
    return this.budgetService.findByUserId(user.id, query);
  }

  @ApiOperation({ summary: 'Get budget by ID' })
  @ApiParam({
    name: 'id',
    description: 'Budget UUID',
    example: 'b1u2d3g4-e5t6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Budget details',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.findById(id, user.id);
  }

  @ApiOperation({ summary: 'Update budget target amount' })
  @ApiParam({
    name: 'id',
    description: 'Budget UUID',
    example: 'b1u2d3g4-e5t6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Budget updated successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.update(id, user.id, dto);
  }

  @ApiOperation({ summary: 'Delete budget entry' })
  @ApiParam({
    name: 'id',
    description: 'Budget UUID',
    example: 'b1u2d3g4-e5t6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Budget deleted successfully',
    type: BudgetResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Budget not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BudgetResponseDto> {
    return this.budgetService.delete(id, user.id);
  }
}
