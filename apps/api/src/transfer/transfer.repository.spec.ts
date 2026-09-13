import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { TransferRepository } from './transfer.repository';

describe('TransferRepository', () => {
  let repository: TransferRepository;
  let databaseService: {
    $transaction: jest.Mock;
    transfer: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const mockTx = {
    transfer: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    account: {
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    transaction: {
      createMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    databaseService = {
      $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx),
      ),
      transfer: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferRepository,
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
      ],
    }).compile();

    repository = module.get<TransferRepository>(TransferRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createWithAtomicBalanceUpdate', () => {
    it('should create transfer, atomically decrement source balance, increment dest balance, and create transaction history entries', async () => {
      const data = {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 200,
        transactionAt: new Date(),
      };

      const createdTransfer = { id: 'transfer-1', ...data };
      mockTx.transfer.create.mockResolvedValue(createdTransfer);
      mockTx.account.updateMany.mockResolvedValue({ count: 1 });
      mockTx.account.update.mockResolvedValue({});
      mockTx.transaction.createMany.mockResolvedValue({ count: 2 });

      const result = await repository.createWithAtomicBalanceUpdate(
        data,
        'Source Checking',
        'Dest Savings',
      );

      expect(mockTx.transfer.create).toHaveBeenCalledWith({ data });
      expect(mockTx.account.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'acc-1',
          balance: {
            gte: 200,
          },
        },
        data: {
          balance: {
            decrement: 200,
          },
        },
      });
      expect(mockTx.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-2' },
        data: { balance: { increment: 200 } },
      });
      expect(mockTx.transaction.createMany).toHaveBeenCalledWith({
        data: [
          {
            accountId: 'acc-1',
            transferId: 'transfer-1',
            type: TransactionType.EXPENSE,
            amount: 200,
            description: 'Transfer to Dest Savings',
            source: TransactionSource.SYSTEM,
            transactionAt: data.transactionAt,
          },
          {
            accountId: 'acc-2',
            transferId: 'transfer-1',
            type: TransactionType.INCOME,
            amount: 200,
            description: 'Transfer from Source Checking',
            source: TransactionSource.SYSTEM,
            transactionAt: data.transactionAt,
          },
        ],
      });
      expect(result).toEqual(createdTransfer);
    });

    it('should throw BadRequestException when source account has insufficient balance (updateMany count === 0)', async () => {
      const data = {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 200,
        transactionAt: new Date(),
      };

      const createdTransfer = { id: 'transfer-1', ...data };
      mockTx.transfer.create.mockResolvedValue(createdTransfer);
      mockTx.account.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.createWithAtomicBalanceUpdate(
          data,
          'Source Checking',
          'Dest Savings',
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        repository.createWithAtomicBalanceUpdate(
          data,
          'Source Checking',
          'Dest Savings',
        ),
      ).rejects.toThrow('Insufficient balance for transfer');

      expect(mockTx.account.update).not.toHaveBeenCalled();
      expect(mockTx.transaction.createMany).not.toHaveBeenCalled();
    });
  });

  describe('findByIdAndUserId', () => {
    it('should find transfer if owned by user', async () => {
      const mockTransferData = { id: 'transfer-1', fromAccountId: 'acc-1' };
      databaseService.transfer.findFirst.mockResolvedValue(mockTransferData);

      const result = await repository.findByIdAndUserId('transfer-1', 'user-1');

      expect(databaseService.transfer.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'transfer-1',
          OR: [
            { fromAccount: { userId: 'user-1' } },
            { toAccount: { userId: 'user-1' } },
          ],
        },
      });
      expect(result).toEqual(mockTransferData);
    });
  });

  describe('findByUserId', () => {
    it('should list transfers for user with options', async () => {
      const mockList = [{ id: 'transfer-1' }];
      databaseService.transfer.findMany.mockResolvedValue(mockList);

      const result = await repository.findByUserId('user-1', {
        fromAccountId: 'acc-1',
      });

      expect(databaseService.transfer.findMany).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              OR: [
                { fromAccount: { userId: 'user-1' } },
                { toAccount: { userId: 'user-1' } },
              ],
            },
            { fromAccountId: 'acc-1' },
          ],
        },
        orderBy: { transactionAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual(mockList);
    });
  });
});
