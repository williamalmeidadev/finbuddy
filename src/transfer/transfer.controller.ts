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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { TransferService } from './transfer.service';

@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    return this.transferService.create(user.id, dto);
  }

  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: TransferQueryDto,
  ): Promise<TransferResponseDto[]> {
    return this.transferService.findByUserId(user.id, query);
  }

  @Get(':id')
  async findOne(
    @CurrentUser() user: AuthenticatedUserDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransferResponseDto> {
    return this.transferService.findById(id, user.id);
  }
}
