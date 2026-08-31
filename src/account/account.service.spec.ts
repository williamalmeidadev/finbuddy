import { Test, TestingModule } from '@nestjs/testing';
import { AccountService } from './account.service';
import { AccountRepository } from './account.repository';
import { AccountType } from '../generated/prisma/enums';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountResponseDto } from './dto/account-response.dto';

describe('AccountService', () => {
  let service: AccountService;
  let accountRepository: {
    create: jest.Mock;
    findById: jest.Mock;
    findByUserId: jest.Mock;
  };

  beforeEach(async () => {
    accountRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
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

      accountRepository.findById.mockResolvedValue(mockDbAccount);

      const result = await service.findById('account-id', userId);

      expect(accountRepository.findById).toHaveBeenCalledWith('account-id');
      expect(result.id).toBe('account-id');
      expect(result.userId).toBe(userId);
    });

    it('should throw NotFoundException when account is not found', async () => {
      accountRepository.findById.mockResolvedValue(null);

      await expect(service.findById('non-existent', 'user-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not the owner of the account', async () => {
      const mockDbAccount = {
        id: 'account-id',
        userId: 'owner-id',
        name: 'Savings',
        type: AccountType.SAVINGS,
        balance: { toNumber: () => 500 },
        currency: 'BRL',
        color: '#00FF00',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      accountRepository.findById.mockResolvedValue(mockDbAccount);

      await expect(service.findById('account-id', 'attacker-id')).rejects.toThrow(
        ForbiddenException,
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
});
