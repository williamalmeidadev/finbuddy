import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinancialSummaryQueryDto } from './dto/financial-summary-query.dto';
import { FinancialSummaryResponseDto } from './dto/financial-summary-response.dto';
import { FinancialSummaryService } from './financial-summary.service';

@UseGuards(JwtAuthGuard)
@Controller('financial-summary')
export class FinancialSummaryController {
  constructor(
    private readonly financialSummaryService: FinancialSummaryService,
  ) {}

  @Get()
  async getSummary(
    @CurrentUser() user: AuthenticatedUserDto,
    @Query() query: FinancialSummaryQueryDto,
  ): Promise<FinancialSummaryResponseDto> {
    return this.financialSummaryService.getSummary(user.id, query);
  }
}
