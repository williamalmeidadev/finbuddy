import { Test, TestingModule } from '@nestjs/testing';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { TransactionController } from './transaction.controller';
import { TransactionService } from './transaction.service';

describe('TransactionController', () => {
  let controller: TransactionController;
  let transactionService: {
    create: jest.Mock;
    findByUserId: jest.Mock;
    findById: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'test@finbuddy.dev',
  };

  beforeEach(async () => {
    transactionService = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransactionController],
      providers: [
        {
          provide: TransactionService,
          useValue: transactionService,
        },
      ],
    }).compile();

    controller = module.get<TransactionController>(TransactionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transaction for authenticated user', async () => {
      const dto = {
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: 150,
        description: 'Freelance',
        transactionAt: new Date(),
      };

      const response = new TransactionResponseDto({
        id: 'tx-1',
        ...dto,
        source: TransactionSource.MANUAL,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      transactionService.create.mockResolvedValue(response);

      const result = await controller.create(user, dto);

      expect(transactionService.create).toHaveBeenCalledWith(user.id, dto);
      expect(result).toBe(response);
    });
  });

  describe('findAll', () => {
    it('should list transactions for current user', async () => {
      const response = [
        new TransactionResponseDto({
          id: 'tx-1',
          accountId: 'acc-1',
          type: TransactionType.INCOME,
          amount: 150,
          description: null,
          source: TransactionSource.MANUAL,
          transactionAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      transactionService.findByUserId.mockResolvedValue(response);

      const result = await controller.findAll(user, { accountId: 'acc-1' });

      expect(transactionService.findByUserId).toHaveBeenCalledWith(user.id, {
        accountId: 'acc-1',
      });
      expect(result).toBe(response);
    });
  });

  describe('findOne', () => {
    it('should return a transaction by id', async () => {
      const response = new TransactionResponseDto({
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: 150,
        description: null,
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      transactionService.findById.mockResolvedValue(response);

      const result = await controller.findOne(user, 'tx-1');

      expect(transactionService.findById).toHaveBeenCalledWith('tx-1', user.id);
      expect(result).toBe(response);
    });
  });

  describe('update', () => {
    it('should update a transaction by id', async () => {
      const dto = { amount: 200 };
      const response = new TransactionResponseDto({
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: 200,
        description: null,
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      transactionService.update.mockResolvedValue(response);

      const result = await controller.update(user, 'tx-1', dto);

      expect(transactionService.update).toHaveBeenCalledWith(
        'tx-1',
        user.id,
        dto,
      );
      expect(result).toBe(response);
    });
  });

  describe('delete', () => {
    it('should delete a transaction by id', async () => {
      const response = new TransactionResponseDto({
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: 150,
        description: null,
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      transactionService.delete.mockResolvedValue(response);

      const result = await controller.delete(user, 'tx-1');

      expect(transactionService.delete).toHaveBeenCalledWith('tx-1', user.id);
      expect(result).toBe(response);
    });
  });
});
