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

  describe('findById', () => {
    it('should return the account found by id', async () => {
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

      prismaMock.account.findUnique.mockResolvedValue(account);

      const result = await repository.findById(account.id);

      expect(prismaMock.account.findUnique).toHaveBeenCalledWith({
        where: { id: account.id },
      });
      expect(result).toEqual(account);
    });

    it('should return null when account is not found', async () => {
      prismaMock.account.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(prismaMock.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
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
    it('should update an account', async () => {
      const id = 'account-id';
      const data: Prisma.AccountUpdateInput = {
        name: 'Updated Checking Name',
      };

      const updatedAccount = {
        id,
        userId: 'user-id',
        name: 'Updated Checking Name',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: 1500,
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.account.update.mockResolvedValue(updatedAccount);

      const result = await repository.update(id, data);

      expect(prismaMock.account.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });
      expect(result).toEqual(updatedAccount);
    });
  });

  describe('delete', () => {
    it('should delete an account', async () => {
      const id = 'account-id';
      const deletedAccount = {
        id,
        userId: 'user-id',
        name: 'Deleted Account',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: 1500,
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.account.delete.mockResolvedValue(deletedAccount);

      const result = await repository.delete(id);

      expect(prismaMock.account.delete).toHaveBeenCalledWith({
        where: { id },
      });
      expect(result).toEqual(deletedAccount);
    });
  });
});
