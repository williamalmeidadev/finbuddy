import { Test, TestingModule } from '@nestjs/testing';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { TransferController } from './transfer.controller';
import { TransferService } from './transfer.service';

describe('TransferController', () => {
  let controller: TransferController;
  let transferService: {
    create: jest.Mock;
    findByUserId: jest.Mock;
    findById: jest.Mock;
  };

  const user = {
    id: 'user-1',
    email: 'test@finbuddy.dev',
  };

  beforeEach(async () => {
    transferService = {
      create: jest.fn(),
      findByUserId: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TransferController],
      providers: [
        {
          provide: TransferService,
          useValue: transferService,
        },
      ],
    }).compile();

    controller = module.get<TransferController>(TransferController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a transfer for authenticated user', async () => {
      const dto = {
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 150,
        transactionAt: new Date(),
      };

      const response = new TransferResponseDto({
        id: 'transfer-1',
        ...dto,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      transferService.create.mockResolvedValue(response);

      const result = await controller.create(user, dto);

      expect(transferService.create).toHaveBeenCalledWith(user.id, dto);
      expect(result).toBe(response);
    });
  });

  describe('findAll', () => {
    it('should list transfers for current user', async () => {
      const response = [
        new TransferResponseDto({
          id: 'transfer-1',
          fromAccountId: 'acc-1',
          toAccountId: 'acc-2',
          amount: 150,
          transactionAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ];

      transferService.findByUserId.mockResolvedValue(response);

      const result = await controller.findAll(user, { fromAccountId: 'acc-1' });

      expect(transferService.findByUserId).toHaveBeenCalledWith(user.id, {
        fromAccountId: 'acc-1',
      });
      expect(result).toBe(response);
    });
  });

  describe('findOne', () => {
    it('should return a transfer by id', async () => {
      const response = new TransferResponseDto({
        id: 'transfer-1',
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 150,
        transactionAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      transferService.findById.mockResolvedValue(response);

      const result = await controller.findOne(user, 'transfer-1');

      expect(transferService.findById).toHaveBeenCalledWith(
        'transfer-1',
        user.id,
      );
      expect(result).toBe(response);
    });
  });
});
