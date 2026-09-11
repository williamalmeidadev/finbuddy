import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinancialSummaryQueryDto } from './dto/financial-summary-query.dto';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';
import { FinancialSummaryService } from './financial-summary.service';

@ApiTags('Financial Summary')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 429,
  description: 'Too Many Requests - Rate limit exceeded',
})
@UseGuards(JwtAuthGuard)
@Controller('financial-summary')
export class FinancialSummaryController {
  constructor(
    private readonly financialSummaryService: FinancialSummaryService,
  ) {}

  @ApiOperation({ summary: 'Get aggregated monthly financial summary' })
  @ApiResponse({
    status: 200,
    description: 'Aggregated financial summary for the specified month',
    type: FinancialSummaryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid month format (must be YYYY-MM)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get()
  async getSummary(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: FinancialSummaryQueryDto,
  ): Promise<FinancialSummaryResponseDto> {
    return this.financialSummaryService.getSummary(user.id, query);
  }
}
