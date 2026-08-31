import { Test, TestingModule } from '@nestjs/testing';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { AccountType } from '../generated/prisma/enums';
import { AccountResponseDto } from './dto/account-response.dto';

describe('AccountController', () => {
  let controller: AccountController;
  let accountService: {
    create: jest.Mock;
    findById: jest.Mock;
    findByUserId: jest.Mock;
  };

  const user = {
    id: 'user-id',
    email: 'test@finbuddy.dev',
  };

  beforeEach(async () => {
    accountService = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountController],
      providers: [
        {
          provide: AccountService,
          useValue: accountService,
        },
      ],
    }).compile();

    controller = module.get<AccountController>(AccountController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an account for current user', async () => {
      const dto = {
        name: 'Savings',
        type: AccountType.SAVINGS,
        color: '#FF5733',
        balance: 100,
      };

      const response = new AccountResponseDto({
        id: 'account-id',
        userId: user.id,
        ...dto,
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      accountService.create.mockResolvedValue(response);

      const result = await controller.create(user, dto);

      expect(accountService.create).toHaveBeenCalledWith(user.id, dto);
      expect(result).toBe(response);
    });
  });

  describe('findAll', () => {
    it('should list all accounts for current user', async () => {
      const response = [
        new AccountResponseDto({
          id: 'account-id',
          userId: user.id,
          name: 'Savings',
          type: AccountType.SAVINGS,
          color: '#FF5733',
          balance: 100,
          currency: 'BRL',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      accountService.findByUserId.mockResolvedValue(response);

      const result = await controller.findAll(user);

      expect(accountService.findByUserId).toHaveBeenCalledWith(user.id);
      expect(result).toBe(response);
    });
  });

  describe('findOne', () => {
    it('should return a specific account', async () => {
      const accountId = 'account-id';
      const response = new AccountResponseDto({
        id: accountId,
        userId: user.id,
        name: 'Savings',
        type: AccountType.SAVINGS,
        color: '#FF5733',
        balance: 100,
        currency: 'BRL',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      accountService.findById.mockResolvedValue(response);

      const result = await controller.findOne(user, accountId);

      expect(accountService.findById).toHaveBeenCalledWith(accountId, user.id);
      expect(result).toBe(response);
    });
  });
});
