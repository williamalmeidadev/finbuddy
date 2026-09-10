import { Test, TestingModule } from '@nestjs/testing';
import { FinancialSummaryController } from './financial-summary.controller';
import { FinancialSummaryService } from './financial-summary.service';

describe('FinancialSummaryController', () => {
  let controller: FinancialSummaryController;
  let service: {
    getSummary: jest.Mock;
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
  };

  beforeEach(async () => {
    service = {
      getSummary: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FinancialSummaryController],
      providers: [
        {
          provide: FinancialSummaryService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<FinancialSummaryController>(
      FinancialSummaryController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getSummary', () => {
    it('should delegate request to FinancialSummaryService', async () => {
      const query = { month: '2026-09' };
      const mockResponse = {
        period: { month: '2026-09' },
        summary: { income: 5000, expenses: 3200, net: 1800 },
      };

      service.getSummary.mockResolvedValue(mockResponse);

      const result = await controller.getSummary(mockUser, query);

      expect(service.getSummary).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toEqual(mockResponse);
    });
  });
});
