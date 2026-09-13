import { Test, TestingModule } from '@nestjs/testing';
import { GetFinancialSummaryTool } from './get-financial-summary.tool';
import { FinancialSummaryService } from '../../../../financial-summary/financial-summary.service';
import { BadRequestException } from '@nestjs/common';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('GetFinancialSummaryTool', () => {
  let tool: GetFinancialSummaryTool;

  const mockFinancialSummaryService = {
    getSummary: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetFinancialSummaryTool,
        {
          provide: FinancialSummaryService,
          useValue: mockFinancialSummaryService,
        },
      ],
    }).compile();

    tool = module.get<GetFinancialSummaryTool>(GetFinancialSummaryTool);
  });

  it('should be defined with name, metadata, and schema', () => {
    expect(tool.name).toBe('get_financial_summary');
    expect(tool.capability).toBe(AgentCapability.READ_FINANCIAL_SUMMARY);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.LOW);
    expect(tool.readOnly).toBe(true);
    expect(tool.inputSchema.additionalProperties).toBe(false);
  });

  it('should pass authenticated userId and optional month to service', async () => {
    const mockSummary = {
      month: '2026-03',
      income: 5000,
      expenses: 2000,
      netIncome: 3000,
      accounts: [],
      incomeCategories: [],
      expenseCategories: [],
      budgets: [],
    };
    mockFinancialSummaryService.getSummary.mockResolvedValue(mockSummary);

    const result = await tool.execute(
      { userId: 'user-123' },
      { month: '2026-03' },
    );

    expect(mockFinancialSummaryService.getSummary).toHaveBeenCalledWith(
      'user-123',
      {
        month: '2026-03',
      },
    );
    expect(result).toEqual({
      success: true,
      data: mockSummary,
    });
  });

  it('should handle bad request exception for invalid month format safely', async () => {
    mockFinancialSummaryService.getSummary.mockRejectedValue(
      new BadRequestException('Invalid month format'),
    );

    const result = await tool.execute(
      { userId: 'user-123' },
      { month: 'invalid-month' },
    );

    expect(result).toEqual({
      success: false,
      error: 'Invalid month format',
    });
  });
});
