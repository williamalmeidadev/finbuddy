import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountRepository } from '../account/account.repository';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { TransferRepository } from './transfer.repository';
import { TransferService } from './transfer.service';

describe('TransferService', () => {
  let service: TransferService;
  let transferRepository: {
    createWithAtomicBalanceUpdate: jest.Mock;
    findByIdAndUserId: jest.Mock;
    findByUserId: jest.Mock;
  };
  let accountRepository: {
    findByIdAndUserId: jest.Mock;
  };

  const userId = 'user-1';

  beforeEach(async () => {
    transferRepository = {
      createWithAtomicBalanceUpdate: jest.fn(),
      findByIdAndUserId: jest.fn(),
      findByUserId: jest.fn(),
    };

    accountRepository = {
      findByIdAndUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransferService,
        {
          provide: TransferRepository,
          useValue: transferRepository,
        },
        {
          provide: AccountRepository,
          useValue: accountRepository,
        },
      ],
    }).compile();

    service = module.get<TransferService>(TransferService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create transfer when all validations pass', async () => {
      const dto = {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 200,
        transactionAt: new Date(),
      };

      accountRepository.findByIdAndUserId
        .mockResolvedValueOnce({
          id: 'acc-1',
          name: 'Checking',
          userId,
          balance: { toNumber: () => 1000 },
          currency: 'BRL',
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 'acc-2',
          name: 'Savings',
          userId,
          balance: { toNumber: () => 500 },
          currency: 'BRL',
          isActive: true,
        });

      const mockCreated = {
        id: 'transfer-1',
        ...dto,
        amount: { toNumber: () => 200 },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transferRepository.createWithAtomicBalanceUpdate.mockResolvedValue(
        mockCreated,
      );

      const result = await service.create(userId, dto);

      expect(accountRepository.findByIdAndUserId).toHaveBeenCalledWith(
        'acc-1',
        userId,
      );
      expect(accountRepository.findByIdAndUserId).toHaveBeenCalledWith(
        'acc-2',
        userId,
      );
      expect(
        transferRepository.createWithAtomicBalanceUpdate,
      ).toHaveBeenCalledWith(
        {
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: 200,
          transactionAt: dto.transactionAt,
        },
        'Checking',
        'Savings',
      );
      expect(result).toBeInstanceOf(TransferResponseDto);
      expect(result.amount).toBe(200);
    });

    it('should throw BadRequestException if source and destination account are the same', async () => {
      await expect(
        service.create(userId, {
          fromAccountId: 'acc-1',
          toAccountId: 'acc-1',
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if source or destination account is unowned or non-existent', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.create(userId, {
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if either account is inactive', async () => {
      accountRepository.findByIdAndUserId
        .mockResolvedValueOnce({
          id: 'acc-1',
          userId,
          balance: { toNumber: () => 1000 },
          currency: 'BRL',
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 'acc-2',
          userId,
          balance: { toNumber: () => 500 },
          currency: 'BRL',
          isActive: false,
        });

      await expect(
        service.create(userId, {
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if currencies do not match', async () => {
      accountRepository.findByIdAndUserId
        .mockResolvedValueOnce({
          id: 'acc-1',
          userId,
          balance: { toNumber: () => 1000 },
          currency: 'BRL',
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 'acc-2',
          userId,
          balance: { toNumber: () => 500 },
          currency: 'USD',
          isActive: true,
        });

      await expect(
        service.create(userId, {
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if source account balance is insufficient', async () => {
      accountRepository.findByIdAndUserId
        .mockResolvedValueOnce({
          id: 'acc-1',
          userId,
          balance: { toNumber: () => 50 },
          currency: 'BRL',
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 'acc-2',
          userId,
          balance: { toNumber: () => 500 },
          currency: 'BRL',
          isActive: true,
        });

      await expect(
        service.create(userId, {
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: 100,
          transactionAt: new Date(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByUserId', () => {
    it('should return list of transfer response DTOs', async () => {
      const mockList = [
        {
          id: 'transfer-1',
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: { toNumber: () => 100 },
          transactionAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      transferRepository.findByUserId.mockResolvedValue(mockList);

      const result = await service.findByUserId(userId);

      expect(transferRepository.findByUserId).toHaveBeenCalledWith(userId, {
        fromAccountId: undefined,
        toAccountId: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('transfer-1');
    });

    it('should throw NotFoundException if query fromAccountId is unowned', async () => {
      accountRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(
        service.findByUserId(userId, { fromAccountId: 'unowned-acc' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findById', () => {
    it('should return transfer DTO when user owns one of the accounts', async () => {
      const mockTransfer = {
        id: 'transfer-1',
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: { toNumber: () => 100 },
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      transferRepository.findByIdAndUserId.mockResolvedValue(mockTransfer);

      const result = await service.findById('transfer-1', userId);

      expect(transferRepository.findByIdAndUserId).toHaveBeenCalledWith(
        'transfer-1',
        userId,
      );
      expect(result.id).toBe('transfer-1');
    });

    it('should throw NotFoundException when transfer is unowned or non-existent', async () => {
      transferRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.findById('transfer-404', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
