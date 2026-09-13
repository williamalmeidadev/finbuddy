import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountRepository } from '../account/account.repository';
import { CategoryRepository } from '../category/category.repository';
import {
  CategoryType,
  TransactionSource,
  TransactionType,
} from '../generated/prisma/enums';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { TransactionRepository } from './transaction.repository';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;
  let transactionRepository: {
    createWithBalanceUpdate: jest.Mock;
    findByIdAndUserId: jest.Mock;
    findByUserId: jest.Mock;
    updateWithBalanceUpdate: jest.Mock;
    deleteWithBalanceUpdate: jest.Mock;
  };
  let accountRepository: {
    findByIdAndUserId: jest.Mock;
  };
  let categoryRepository: {
    findByIdAndUserId: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    transactionRepository = {
      createWithBalanceUpdate: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      updateWithBalanceUpdate: jest.fn(),
      deleteWithBalanceUpdate: jest.fn(),
    };

    accountRepository = {
      findByIdAndUserId: jest.fn(),
    };

    categoryRepository = {
      findByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: TransactionRepository,
          useValue: transactionRepository,
        },
        {
          provide: AccountRepository,
          useValue: accountRepository,
        },
        {
          provide: CategoryRepository,
          useValue: categoryRepository,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an INCOME transaction and increase balance delta', async () => {
      const dto = {
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: 250,
        description: 'Salary Bonus',
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
      };

      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      const mockCreated = {
        id: 'tx-1',
        ...dto,
        amount: { toNumber: () => 250 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactionRepository.createWithBalanceUpdate.mockResolvedValue(
        mockCreated,
      );

      const result = await service.create(userId, dto);

      expect(accountRepository.findByIdAndUserId).toHaveBeenCalledWith(
        'acc-1',
        userId,
      );
      expect(
        transactionRepository.createWithBalanceUpdate,
      ).toHaveBeenCalledWith(
        {
          accountId: 'acc-1',
          type: TransactionType.INCOME,
          amount: 250,
          description: 'Salary Bonus',
          source: TransactionSource.MANUAL,
          transactionAt: dto.transactionAt,
        },
        250,
      );
      expect(result).toBeInstanceOf(TransactionResponseDto);
      expect(result.amount).toBe(250);
    });

    it('should create an EXPENSE transaction and decrease balance delta', async () => {
      const dto = {
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: 50,
        transactionAt: new Date(),
      };

      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      const mockCreated = {
        id: 'tx-2',
        ...dto,
        description: null,
        source: TransactionSource.MANUAL,
        amount: { toNumber: () => 50 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactionRepository.createWithBalanceUpdate.mockResolvedValue(
        mockCreated,
      );

      const result = await service.create(userId, dto);

      expect(
        transactionRepository.createWithBalanceUpdate,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          type: TransactionType.EXPENSE,
          amount: 50,
        }),
        -50,
      );
      expect(result.amount).toBe(50);
    });

    it('should propagate BadRequestException when repository throws insufficient balance', async () => {
      const dto = {
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: 50,
        transactionAt: new Date(),
      };

      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      transactionRepository.createWithBalanceUpdate.mockRejectedValue(
        new BadRequestException('Insufficient balance'),
      );

      await expect(service.create(userId, dto)).rejects.toThrow(
        new BadRequestException('Insufficient balance'),
      );
    });

    it('should throw NotFoundException if account is not found or not owned by user', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          accountId: 'acc-404',
          type: TransactionType.INCOME,
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if account is inactive', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: false,
      });

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          type: TransactionType.INCOME,
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if categoryId does not exist for user', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });
      categoryRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          categoryId: 'cat-404',
          type: TransactionType.INCOME,
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if category is inactive', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        isActive: false,
        type: CategoryType.INCOME,
      });

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          categoryId: 'cat-1',
          type: TransactionType.INCOME,
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if category type does not match transaction type', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });
      categoryRepository.findByIdAndUserId.mockResolvedValue({
        id: 'cat-1',
        userId,
        isActive: true,
        type: CategoryType.EXPENSE,
      });

      await expect(
        service.create(userId, {
          accountId: 'acc-1',
          categoryId: 'cat-1',
          type: TransactionType.INCOME,
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByUserId', () => {
    it('should return list of transaction response DTOs', async () => {
      const mockList = [
        {
          id: 'tx-1',
          accountId: 'acc-1',
          type: TransactionType.INCOME,
          amount: { toNumber: () => 100 },
          description: null,
          source: TransactionSource.MANUAL,
          transactionAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      transactionRepository.findByUserId.mockResolvedValue(mockList);

      const result = await service.findByUserId(userId);

      expect(transactionRepository.findByUserId).toHaveBeenCalledWith(userId, {
        accountId: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tx-1');
    });

    it('should throw NotFoundException if specific accountId filter is provided but unowned', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.findByUserId(userId, { accountId: 'unowned-acc' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return transaction DTO when user owns account', async () => {
      const mockTx = {
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: { toNumber: () => 100 },
        description: 'Test',
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactionRepository.findByIdAndUserId.mockResolvedValue(mockTx);

      const result = await service.findById('tx-1', userId);

      expect(transactionRepository.findByIdAndUserId).toHaveBeenCalledWith(
        'tx-1',
        userId,
      );
      expect(result.id).toBe('tx-1');
    });

    it('should throw NotFoundException when transaction is unowned or non-existent', async () => {
      transactionRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById('tx-404', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should calculate new balance delta correctly when changing INCOME to EXPENSE', async () => {
      const existing = {
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: { toNumber: () => 100 },
        transactionAt: new Date(),
      };

      transactionRepository.findByIdAndUserId.mockResolvedValue(existing);
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      const updatedMock = {
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: { toNumber: () => 50 },
        description: null,
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactionRepository.updateWithBalanceUpdate.mockResolvedValue(
        updatedMock,
      );

      const result = await service.update('tx-1', userId, {
        type: TransactionType.EXPENSE,
        amount: 50,
      });

      // Old impact: +100. New impact: -50. Delta = -50 - (+100) = -150
      expect(
        transactionRepository.updateWithBalanceUpdate,
      ).toHaveBeenCalledWith(
        'tx-1',
        userId,
        expect.any(Object),
        -150,
        undefined,
      );
      expect(result.type).toBe(TransactionType.EXPENSE);
    });

    it('should throw BadRequestException if trying to update transfer-linked or system transaction', async () => {
      transactionRepository.findByIdAndUserId.mockResolvedValue({
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.EXPENSE,
        amount: { toNumber: () => 100 },
        source: TransactionSource.SYSTEM,
        transferId: null,
      });

      await expect(
        service.update('tx-1', userId, { amount: 200 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if updating transaction for an inactive account', async () => {
      transactionRepository.findByIdAndUserId.mockResolvedValue({
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: { toNumber: () => 100 },
      });

      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: false,
      });

      await expect(
        service.update('tx-1', userId, { amount: 200 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate BadRequestException when repository throws insufficient balance during update', async () => {
      const existing = {
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: { toNumber: () => 100 },
        transactionAt: new Date(),
      };

      transactionRepository.findByIdAndUserId.mockResolvedValue(existing);
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      transactionRepository.updateWithBalanceUpdate.mockRejectedValue(
        new BadRequestException('Insufficient balance'),
      );

      await expect(
        service.update('tx-1', userId, {
          type: TransactionType.EXPENSE,
          amount: 50,
        }),
      ).rejects.toThrow(new BadRequestException('Insufficient balance'));
    });
  });

  describe('delete', () => {
    it('should reverse balance impact when deleting transaction', async () => {
      const existing = {
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: { toNumber: () => 100 },
        description: null,
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactionRepository.findByIdAndUserId.mockResolvedValue(existing);
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      transactionRepository.deleteWithBalanceUpdate.mockResolvedValue(existing);

      const result = await service.delete('tx-1', userId);

      // Reversal for INCOME +100 is -100
      expect(
        transactionRepository.deleteWithBalanceUpdate,
      ).toHaveBeenCalledWith('tx-1', userId, -100);
      expect(result.id).toBe('tx-1');
    });

    it('should propagate BadRequestException when repository throws insufficient balance during delete reversal', async () => {
      const existing = {
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: { toNumber: () => 100 },
        description: null,
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transactionRepository.findByIdAndUserId.mockResolvedValue(existing);
      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: true,
      });

      transactionRepository.deleteWithBalanceUpdate.mockRejectedValue(
        new BadRequestException('Insufficient balance'),
      );

      await expect(service.delete('tx-1', userId)).rejects.toThrow(
        new BadRequestException('Insufficient balance'),
      );
    });

    it('should throw BadRequestException if deleting transaction for an inactive account', async () => {
      transactionRepository.findByIdAndUserId.mockResolvedValue({
        id: 'tx-1',
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: { toNumber: () => 100 },
      });

      accountRepository.findByIdAndUserId.mockResolvedValue({
        id: 'acc-1',
        userId,
        isActive: false,
      });

      await expect(service.delete('tx-1', userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
