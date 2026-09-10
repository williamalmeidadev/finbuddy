import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { AccountRepository } from './account.repository';
import { AccountType } from '../generated/prisma/enums';
import { NotFoundException } from '@nestjs/common';
import { AccountResponseDto } from './dto/account-response.dto';

describe('AccountService', () => {
  let service: AccountService;
  let accountRepository: {
    create: jest.Mock;
    findByIdAndUserId: jest.Mock;
    findByUserId: jest.Mock;
    update: jest.Mock;
    deactivate: jest.Mock;
  };

  beforeEach(async () => {
    accountRepository = {
      create: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AccountService,
        {
          provide: AccountRepository,
          useValue: accountRepository,
        },
      ],
    }).compile();

    service = module.get<AccountService>(AccountService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an account and return it as a DTO', async () => {
      const userId = 'user-id';
      const dto = {
        name: 'Main Checking',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: 1000,
        currency: 'USD',
        isActive: true,
      };

      const mockDbAccount = {
        id: 'account-id',
        userId,
        ...dto,
        balance: { toNumber: () => dto.balance },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      accountRepository.create.mockResolvedValue(mockDbAccount);

      const result = await service.create(userId, dto);

      expect(accountRepository.create).toHaveBeenCalledWith({
        userId,
        name: dto.name,
        type: dto.type,
        balance: dto.balance,
        currency: dto.currency,
        color: dto.color,
        isActive: dto.isActive,
      });
      expect(result).toBeInstanceOf(AccountResponseDto);
      expect(result.id).toBe('account-id');
      expect(result.balance).toBe(1000);
    });

    it('should use default values for balance, currency and isActive if not provided', async () => {
      const userId = 'user-id';
      const dto = {
        name: 'Main Checking',
        type: AccountType.CHECKING,
        color: '#FF5733',
      };

      const mockDbAccount = {
        id: 'account-id',
        userId,
        name: dto.name,
        type: dto.type,
        color: dto.color,
        balance: { toNumber: () => 0 },
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      accountRepository.create.mockResolvedValue(mockDbAccount);

      const result = await service.create(userId, dto);

      expect(accountRepository.create).toHaveBeenCalledWith({
        userId,
        name: dto.name,
        type: dto.type,
        balance: 0,
        currency: 'BRL',
        color: dto.color,
        isActive: true,
      });
      expect(result.balance).toBe(0);
      expect(result.currency).toBe('BRL');
      expect(result.isActive).toBe(true);
    });
  });

  describe('findById', () => {
    it('should return account response DTO when owner queries it', async () => {
      const userId = 'user-id';
      const mockDbAccount = {
        id: 'account-id',
        userId,
        name: 'Savings',
        type: AccountType.SAVINGS,
        balance: { toNumber: () => 500 },
        currency: 'BRL',
        color: '#00FF00',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      accountRepository.findByIdAndUserId.mockResolvedValue(mockDbAccount);

      const result = await service.findById('account-id', userId);

      expect(accountRepository.findByIdAndUserId).toHaveBeenCalledWith(
        'account-id',
        userId,
      );
      expect(result.id).toBe('account-id');
      expect(result.userId).toBe(userId);
    });

    it('should throw NotFoundException when account is not found or unowned', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById('non-existent', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByUserId', () => {
    it('should return list of user accounts', async () => {
      const userId = 'user-id';
      const mockDbAccounts = [
        {
          id: 'account-1',
          userId,
          name: 'Checking',
          type: AccountType.CHECKING,
          balance: { toNumber: () => 150 },
          currency: 'BRL',
          color: '#FF0000',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      accountRepository.findByUserId.mockResolvedValue(mockDbAccounts);

      const result = await service.findByUserId(userId);

      expect(accountRepository.findByUserId).toHaveBeenCalledWith(userId);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('account-1');
      expect(result[0].balance).toBe(150);
    });
  });

  describe('update', () => {
    it('should update account and return response DTO', async () => {
      const userId = 'user-id';
      const accountId = 'account-id';
      const dto = { name: 'Updated Name' };

      const updatedAccount = {
        id: accountId,
        userId,
        name: 'Updated Name',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: { toNumber: () => 100 },
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      accountRepository.update.mockResolvedValue(updatedAccount);

      const result = await service.update(accountId, userId, dto);

      expect(accountRepository.update).toHaveBeenCalledWith(
        accountId,
        userId,
        dto,
      );
      expect(result.name).toBe('Updated Name');
    });

    it('should throw NotFoundException when updating non-existent or unowned account', async () => {
      accountRepository.update.mockResolvedValue(null);

      await expect(
        service.update('account-id', 'user-id', { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deactivate', () => {
    it('should deactivate account and return response DTO with isActive false', async () => {
      const userId = 'user-id';
      const accountId = 'account-id';

      const deactivatedAccount = {
        id: accountId,
        userId,
        name: 'Account',
        type: AccountType.CHECKING,
        color: '#FF5733',
        balance: { toNumber: () => 100 },
        currency: 'BRL',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      accountRepository.deactivate.mockResolvedValue(deactivatedAccount);

      const result = await service.deactivate(accountId, userId);

      expect(accountRepository.deactivate).toHaveBeenCalledWith(
        accountId,
        userId,
      );
      expect(result.isActive).toBe(false);
    });

    it('should throw NotFoundException when deactivating non-existent or unowned account', async () => {
      accountRepository.deactivate.mockResolvedValue(null);

      await expect(service.deactivate('account-id', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
