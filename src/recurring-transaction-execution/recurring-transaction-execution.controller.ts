import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ExecuteRecurringTransactionDto } from './dto/execute-recurring-transaction.dto';
import { RecurringTransactionExecutionResponseDto } from './dto/recurring-transaction-execution-response.dto';
import { RecurringTransactionExecutionService } from './recurring-transaction-execution.service';

@ApiTags('Recurring Transactions')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('recurring-transactions')
export class RecurringTransactionExecutionController {
  constructor(private readonly service: RecurringTransactionExecutionService) {}

  @ApiOperation({
    summary: 'Trigger manual or batch execution of due recurring transactions',
  })
  @ApiResponse({
    status: 200,
    description:
      'Execution result summary (processed, created, skipped, deactivated)',
    type: RecurringTransactionExecutionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid until date parameter' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() queryDto: ExecuteRecurringTransactionDto,
    @Body() bodyDto: ExecuteRecurringTransactionDto,
  ): Promise<RecurringTransactionExecutionResponseDto> {
    const until = queryDto?.until || bodyDto?.until;
    return this.service.execute(user.id, { until });
  }
}
