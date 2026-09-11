import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
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
import { TransferQueryDto } from './dto/transfer-query.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { TransferService } from './transfer.service';

@ApiTags('Transfers')
@ApiBearerAuth('JWT-auth')
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
}
