import { Test, TestingModule } from '@nestjs/testing';
import { AiAgentProactiveAlertsService } from './ai-agent-proactive-alerts.service';
import { BudgetRepository } from '../../../budget/budget.repository';

describe('AiAgentProactiveAlertsService', () => {
  let service: AiAgentProactiveAlertsService;
  let mockBudgetRepository: any;

  beforeEach(async () => {
    mockBudgetRepository = {
      findByUserId: jest.fn(),
      calculateSpending: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiAgentProactiveAlertsService,
        {
          provide: BudgetRepository,
          useValue: mockBudgetRepository,
        },
      ],
    }).compile();

    service = module.get<AiAgentProactiveAlertsService>(
      AiAgentProactiveAlertsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return empty array when user has no budgets', async () => {
    mockBudgetRepository.findByUserId.mockResolvedValue([]);

    const alerts = await service.checkUserBudgetAlerts('u-1');
    expect(alerts).toEqual([]);
  });

  it('should generate WARNING alert when spending is 85% of budget', async () => {
    mockBudgetRepository.findByUserId.mockResolvedValue([
      { id: 'b-1', userId: 'u-1', categoryId: 'cat-1', amount: 1000 },
    ]);
    mockBudgetRepository.calculateSpending.mockResolvedValue(850);

    const alerts = await service.checkUserBudgetAlerts('u-1');
    expect(alerts.length).toBe(1);
    expect(alerts[0].alertLevel).toBe('WARNING');
    expect(alerts[0].percentageUsed).toBe(85);
  });

  it('should generate EXCEEDED alert when spending reaches 105% of budget', async () => {
    mockBudgetRepository.findByUserId.mockResolvedValue([
      { id: 'b-1', userId: 'u-1', categoryId: 'cat-1', amount: 1000 },
    ]);
    mockBudgetRepository.calculateSpending.mockResolvedValue(1050);

    const alerts = await service.checkUserBudgetAlerts('u-1');
    expect(alerts.length).toBe(1);
    expect(alerts[0].alertLevel).toBe('EXCEEDED');
    expect(alerts[0].percentageUsed).toBe(105);
  });
});
