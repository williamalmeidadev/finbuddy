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
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { TransferService } from './transfer.service';

@ApiTags('Transfers')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 429,
  description: 'Too Many Requests - Rate limit exceeded',
})
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @ApiOperation({ summary: 'Create an account-to-account transfer' })
  @ApiResponse({
    status: 201,
    description: 'Transfer created and balances updated',
    type: TransferResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error (e.g. same source and destination)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Source or destination account not found',
  })
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    return this.transferService.create(user.id, dto);
  }

  @ApiOperation({ summary: 'Get all transfers for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'List of user transfers',
    type: [TransferResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: TransferQueryDto,
  ): Promise<TransferResponseDto[]> {
    return this.transferService.findByUserId(user.id, query);
  }

  @ApiOperation({ summary: 'Get transfer by ID' })
  @ApiParam({
    name: 'id',
    description: 'Transfer UUID',
    example: 'tr1u2v3w-x5y6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer details',
    type: TransferResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransferResponseDto> {
    return this.transferService.findById(id, user.id);
  }

  @ApiOperation({ summary: 'Update transfer details' })
  @ApiParam({
    name: 'id',
    description: 'Transfer UUID',
    example: 'tr1u2v3w-x5y6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer updated successfully',
    type: TransferResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  @Patch(':id')
  async update(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransferDto,
  ): Promise<TransferResponseDto> {
    return this.transferService.update(id, user.id, dto);
  }

  @ApiOperation({ summary: 'Delete transfer and reverse account balances' })
  @ApiParam({
    name: 'id',
    description: 'Transfer UUID',
    example: 'tr1u2v3w-x5y6-7890-abcd-ef1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Transfer deleted successfully',
    type: TransferResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Transfer not found' })
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransferResponseDto> {
    return this.transferService.delete(id, user.id);
  }
}
