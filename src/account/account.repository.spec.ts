import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '../database/database.service';
import { AccountRepository } from './account.repository';
import { AccountType } from '../generated/prisma/enums';
import { Prisma } from '../generated/prisma/client';

describe('AccountRepository', () => {
  let repository: AccountRepository;

  const prismaMock = {
    account: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountRepository,
        {
          provide: DatabaseService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    repository = module.get<AccountRepository>(AccountRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('create', () => {
    it('should create an account', async () => {
      const data: Prisma.AccountUncheckedCreateInput = {
        userId: 'user-id',
        name: 'Main Checking',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: 1500,
        currency: 'BRL',
      };

      const createdAccount = {
        id: 'account-id',
        ...data,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.account.create.mockResolvedValue(createdAccount);

      const result = await repository.create(data);

      expect(prismaMock.account.create).toHaveBeenCalledWith({
        data,
      });
      expect(result).toEqual(createdAccount);
    });
  });

  describe('findByIdAndUserId', () => {
    it('should return the account found by id and userId', async () => {
      const account = {
        id: 'account-id',
        userId: 'user-id',
        name: 'Main Checking',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: 1500,
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.account.findFirst.mockResolvedValue(account);

      const result = await repository.findByIdAndUserId(
        account.id,
        account.userId,
      );

      expect(prismaMock.account.findFirst).toHaveBeenCalledWith({
        where: { id: account.id, userId: account.userId },
      });
      expect(result).toEqual(account);
    });

    it('should return null when account is not found or belongs to another user', async () => {
      prismaMock.account.findFirst.mockResolvedValue(null);

      const result = await repository.findByIdAndUserId(
        'non-existent-id',
        'user-id',
      );

      expect(prismaMock.account.findFirst).toHaveBeenCalledWith({
        where: { id: 'non-existent-id', userId: 'user-id' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should return accounts belonging to a user', async () => {
      const accounts = [
        {
          id: 'account-1',
          userId: 'user-id',
          name: 'Checking',
          type: AccountType.CHECKING,
          color: '#FF5733',
          balance: 1500,
          currency: 'BRL',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      prismaMock.account.findMany.mockResolvedValue(accounts);

      const result = await repository.findByUserId('user-id');

      expect(prismaMock.account.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-id' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual(accounts);
    });
  });

  describe('update', () => {
    it('should update an account if owned by user', async () => {
      const id = 'account-id';
      const userId = 'user-id';
      const data: Prisma.AccountUpdateInput = {
        name: 'Updated Checking Name',
      };

      const existingAccount = {
        id,
        userId,
        name: 'Old Checking Name',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: 1500,
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedAccount = {
        ...existingAccount,
        name: 'Updated Checking Name',
      };

      prismaMock.account.findFirst.mockResolvedValue(existingAccount);
      prismaMock.account.update.mockResolvedValue(updatedAccount);

      const result = await repository.update(id, userId, data);

      expect(prismaMock.account.findFirst).toHaveBeenCalledWith({
        where: { id, userId },
      });
      expect(prismaMock.account.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });
      expect(result).toEqual(updatedAccount);
    });

    it('should return null when updating an unowned or non-existent account', async () => {
      prismaMock.account.findFirst.mockResolvedValue(null);

      const result = await repository.update('other-id', 'user-id', {
        name: 'New Name',
      });

      expect(result).toBeNull();
      expect(prismaMock.account.update).not.toHaveBeenCalled();
    });
  });

  describe('deactivate', () => {
    it('should deactivate an account setting isActive to false', async () => {
      const id = 'account-id';
      const userId = 'user-id';
      const existingAccount = {
        id,
        userId,
        name: 'Active Account',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: 1500,
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const deactivatedAccount = {
        ...existingAccount,
        isActive: false,
      };

      prismaMock.account.findFirst.mockResolvedValue(existingAccount);
      prismaMock.account.update.mockResolvedValue(deactivatedAccount);

      const result = await repository.deactivate(id, userId);

      expect(prismaMock.account.update).toHaveBeenCalledWith({
        where: { id },
        data: { isActive: false },
      });
      expect(result).toEqual(deactivatedAccount);
    });
  });
});
