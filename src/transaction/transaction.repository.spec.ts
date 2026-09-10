import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { TransactionRepository } from './transaction.repository';

describe('TransactionRepository', () => {
  let repository: TransactionRepository;
  let databaseService: {
    $transaction: jest.Mock;
    transaction: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
  };

  const mockTx = {
    transaction: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    account: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    databaseService = {
      $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<unknown>) =>
        cb(mockTx),
      ),
      transaction: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionRepository,
        {
          provide: DatabaseService,
          useValue: databaseService,
        },
      ],
    }).compile();

    repository = module.get<TransactionRepository>(TransactionRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('createWithBalanceUpdate', () => {
    it('should create transaction and update account balance atomically', async () => {
      const data = {
        accountId: 'acc-1',
        type: TransactionType.INCOME,
        amount: 100,
        description: 'Salary',
        source: TransactionSource.MANUAL,
        transactionAt: new Date(),
      };

      const createdTx = { id: 'tx-1', ...data };
      mockTx.transaction.create.mockResolvedValue(createdTx);
      mockTx.account.update.mockResolvedValue({});

      const result = await repository.createWithBalanceUpdate(data, 100);

      expect(mockTx.transaction.create).toHaveBeenCalledWith({ data });
      expect(mockTx.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: 100 } },
      });
      expect(result).toEqual(createdTx);
    });
  });

  describe('findByIdAndUserId', () => {
    it('should find transaction by id and account owner user id', async () => {
      const mockTxData = { id: 'tx-1', accountId: 'acc-1' };
      databaseService.transaction.findFirst.mockResolvedValue(mockTxData);

      const result = await repository.findByIdAndUserId('tx-1', 'user-1');

      expect(databaseService.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'tx-1', account: { userId: 'user-1' } },
      });
      expect(result).toEqual(mockTxData);
    });
  });

  describe('findByUserId', () => {
    it('should list transactions for user', async () => {
      const mockList = [{ id: 'tx-1' }];
      databaseService.transaction.findMany.mockResolvedValue(mockList);

      const result = await repository.findByUserId('user-1', {
        accountId: 'acc-1',
      });

      expect(databaseService.transaction.findMany).toHaveBeenCalledWith({
        where: { account: { userId: 'user-1' }, accountId: 'acc-1' },
        orderBy: { transactionAt: 'desc' },
        take: 50,
        skip: 0,
      });
      expect(result).toEqual(mockList);
    });
  });

  describe('updateWithBalanceUpdate', () => {
    it('should update transaction and update balance delta when found', async () => {
      const existing = { id: 'tx-1', accountId: 'acc-1' };
      const updated = { id: 'tx-1', accountId: 'acc-1', amount: 200 };

      mockTx.transaction.findFirst.mockResolvedValue(existing);
      mockTx.transaction.update.mockResolvedValue(updated);

      const result = await repository.updateWithBalanceUpdate(
        'tx-1',
        'user-1',
        { amount: 200 },
        100,
      );

      expect(mockTx.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'tx-1', account: { userId: 'user-1' } },
      });
      expect(mockTx.transaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
        data: { amount: 200 },
      });
      expect(mockTx.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: 100 } },
      });
      expect(result).toEqual(updated);
    });

    it('should return null when transaction to update is not found', async () => {
      mockTx.transaction.findFirst.mockResolvedValue(null);

      const result = await repository.updateWithBalanceUpdate(
        'tx-404',
        'user-1',
        { amount: 200 },
        100,
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteWithBalanceUpdate', () => {
    it('should delete transaction and reverse balance delta when found', async () => {
      const existing = { id: 'tx-1', accountId: 'acc-1' };
      const deleted = { id: 'tx-1', accountId: 'acc-1' };

      mockTx.transaction.findFirst.mockResolvedValue(existing);
      mockTx.transaction.delete.mockResolvedValue(deleted);

      const result = await repository.deleteWithBalanceUpdate(
        'tx-1',
        'user-1',
        -100,
      );

      expect(mockTx.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: 'tx-1', account: { userId: 'user-1' } },
      });
      expect(mockTx.transaction.delete).toHaveBeenCalledWith({
        where: { id: 'tx-1' },
      });
      expect(mockTx.account.update).toHaveBeenCalledWith({
        where: { id: 'acc-1' },
        data: { balance: { increment: -100 } },
      });
      expect(result).toEqual(deleted);
    });

    it('should return null when transaction to delete is not found', async () => {
      mockTx.transaction.findFirst.mockResolvedValue(null);

      const result = await repository.deleteWithBalanceUpdate(
        'tx-404',
        'user-1',
        -100,
      );

      expect(result).toBeNull();
    });
  });
});
