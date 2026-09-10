import { Test, TestingModule } from '@nestjs/testing';
import {
  RecurrenceFrequency,
  TransactionType,
} from '../generated/prisma/enums';
import { RecurringTransactionController } from './recurring-transaction.controller';
import { RecurringTransactionService } from './recurring-transaction.service';

describe('RecurringTransactionController', () => {
  let controller: RecurringTransactionController;
  let service: {
    create: jest.Mock;
    findByUserId: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };

  const mockUser = {
    id: 'user-1',
    email: 'user@example.com',
  };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringTransactionController],
      providers: [
        {
          provide: RecurringTransactionService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<RecurringTransactionController>(
      RecurringTransactionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should delegate creation to RecurringTransactionService', async () => {
      const dto = {
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: 1500,
        frequency: RecurrenceFrequency.MONTHLY,
        startDate: '2026-09-10',
      };

      const mockResponse = { id: 'rec-1', ...dto };
      service.create.mockResolvedValue(mockResponse);

      const result = await controller.create(mockUser, dto);

      expect(service.create).toHaveBeenCalledWith(mockUser.id, dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findAll', () => {
    it('should delegate search to RecurringTransactionService', async () => {
      const query = { type: TransactionType.EXPENSE };
      const mockResponse = [{ id: 'rec-1', amount: 1500 }];
      service.findByUserId.mockResolvedValue(mockResponse);

      const result = await controller.findAll(mockUser, query);

      expect(service.findByUserId).toHaveBeenCalledWith(mockUser.id, query);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('findOne', () => {
    it('should delegate findOne to RecurringTransactionService', async () => {
      const mockResponse = { id: 'rec-1', amount: 1500 };
      service.findById.mockResolvedValue(mockResponse);

      const result = await controller.findOne(mockUser, 'rec-1');

      expect(service.findById).toHaveBeenCalledWith('rec-1', mockUser.id);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should delegate update to RecurringTransactionService', async () => {
      const dto = { amount: 1600 };
      const mockResponse = { id: 'rec-1', amount: 1600 };
      service.update.mockResolvedValue(mockResponse);

      const result = await controller.update(mockUser, 'rec-1', dto);

      expect(service.update).toHaveBeenCalledWith('rec-1', mockUser.id, dto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('remove', () => {
    it('should delegate deactivation to RecurringTransactionService', async () => {
      const mockResponse = { id: 'rec-1', isActive: false };
      service.deactivate.mockResolvedValue(mockResponse);

      const result = await controller.remove(mockUser, 'rec-1');

      expect(service.deactivate).toHaveBeenCalledWith('rec-1', mockUser.id);
      expect(result).toEqual(mockResponse);
    });
  });
});
