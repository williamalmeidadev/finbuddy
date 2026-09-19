import { Test, TestingModule } from '@nestjs/testing';
import { BudgetRepository } from '../budget/budget.repository';
import { CategoryRepository } from '../category/category.repository';
import { BudgetAlertsService } from './budget-alerts.service';

describe('BudgetAlertsService', () => {
  let service: BudgetAlertsService;
  let budgetRepositoryMock: jest.Mocked<Partial<BudgetRepository>>;
  let categoryRepositoryMock: jest.Mocked<Partial<CategoryRepository>>;

  beforeEach(async () => {
    budgetRepositoryMock = {
      findByCategoryMonthAndUserId: jest.fn(),
      calculateSpending: jest.fn(),
    };

    categoryRepositoryMock = {
      findByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BudgetAlertsService,
        { provide: BudgetRepository, useValue: budgetRepositoryMock },
        { provide: CategoryRepository, useValue: categoryRepositoryMock },
      ],
    }).compile();

    service = module.get<BudgetAlertsService>(BudgetAlertsService);
  });

  it('should return null if categoryId is missing', async () => {
    const alert = await service.evaluateTransactionAlert('user-1', null);
    expect(alert).toBeNull();
  });

  it('should return null if no budget exists', async () => {
    budgetRepositoryMock.findByCategoryMonthAndUserId!.mockResolvedValue(null);
    const alert = await service.evaluateTransactionAlert('user-1', 'cat-1');
    expect(alert).toBeNull();
  });

  it('should return null if percentageUsed < 50%', async () => {
    budgetRepositoryMock.findByCategoryMonthAndUserId!.mockResolvedValue({
      id: 'b-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 1000,
      month: new Date('2026-09-01T00:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    budgetRepositoryMock.calculateSpending!.mockResolvedValue(400);

    const alert = await service.evaluateTransactionAlert('user-1', 'cat-1');
    expect(alert).toBeNull();
  });

  it('should return INFO alert when spending reaches 50%', async () => {
    budgetRepositoryMock.findByCategoryMonthAndUserId!.mockResolvedValue({
      id: 'b-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 1000,
      month: new Date('2026-09-01T00:00:00.000Z'),
      category: { name: 'Alimentação' },
    } as any);

    budgetRepositoryMock.calculateSpending!.mockResolvedValue(550);

    const alert = await service.evaluateTransactionAlert('user-1', 'cat-1');
    expect(alert).not.toBeNull();
    expect(alert?.alertLevel).toBe('INFO');
    expect(alert?.percentageUsed).toBe(55);
    expect(alert?.message).toContain('Alimentação');
  });

  it('should return CRITICAL alert when spending reaches 90%', async () => {
    budgetRepositoryMock.findByCategoryMonthAndUserId!.mockResolvedValue({
      id: 'b-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 1000,
      month: new Date('2026-09-01T00:00:00.000Z'),
    } as any);

    categoryRepositoryMock.findByIdAndUserId!.mockResolvedValue({
      id: 'cat-1',
      name: 'Mercado',
    } as any);

    budgetRepositoryMock.calculateSpending!.mockResolvedValue(920);

    const alert = await service.evaluateTransactionAlert('user-1', 'cat-1');
    expect(alert).not.toBeNull();
    expect(alert?.alertLevel).toBe('CRITICAL');
    expect(alert?.percentageUsed).toBe(92);
    expect(alert?.categoryName).toBe('Mercado');
  });

  it('should return EXCEEDED alert when spending reaches or exceeds 100%', async () => {
    budgetRepositoryMock.findByCategoryMonthAndUserId!.mockResolvedValue({
      id: 'b-1',
      userId: 'user-1',
      categoryId: 'cat-1',
      amount: 500,
      month: new Date('2026-09-01T00:00:00.000Z'),
      category: { name: 'Lazer' },
    } as any);

    budgetRepositoryMock.calculateSpending!.mockResolvedValue(550);

    const alert = await service.evaluateTransactionAlert('user-1', 'cat-1');
    expect(alert).not.toBeNull();
    expect(alert?.alertLevel).toBe('EXCEEDED');
    expect(alert?.percentageUsed).toBe(110);
    expect(alert?.message).toContain('Orçamento estourado');
  });
});
