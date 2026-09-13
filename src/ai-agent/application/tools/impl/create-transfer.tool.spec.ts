import { Test, TestingModule } from '@nestjs/testing';
import { CreateTransferTool } from './create-transfer.tool';
import { TransferService } from '../../../../transfer/transfer.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';
import { BadRequestException } from '@nestjs/common';

describe('CreateTransferTool', () => {
  let tool: CreateTransferTool;
  let transferService: jest.Mocked<Partial<TransferService>>;

  beforeEach(async () => {
    transferService = {
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateTransferTool,
        {
          provide: TransferService,
          useValue: transferService,
        },
      ],
    }).compile();

    tool = module.get<CreateTransferTool>(CreateTransferTool);
  });

  it('should have metadata configured correctly for high-risk write action', () => {
    expect(tool.name).toBe('create_transfer');
    expect(tool.capability).toBe(AgentCapability.CREATE_TRANSFER);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.HIGH);
    expect(tool.readOnly).toBe(false);
    expect(tool.requiresConfirmation).toBe(true);
  });

  it('should call TransferService.create with context.userId and return success result', async () => {
    const mockTransfer = {
      id: 'tr-111',
      fromAccountId: 'a1111111-1111-4111-8111-111111111111',
      toAccountId: 'a2222222-2222-4222-8222-222222222222',
      amount: 100.0,
      transactionAt: new Date('2026-09-13T15:30:00.000Z'),
      createdAt: new Date(),
    };

    (transferService.create as jest.Mock).mockResolvedValue(mockTransfer);

    const result = await tool.execute(
      { userId: 'user-123' },
      {
        fromAccountId: 'a1111111-1111-4111-8111-111111111111',
        toAccountId: 'a2222222-2222-4222-8222-222222222222',
        amount: 100.0,
        transactionAt: '2026-09-13T15:30:00.000Z',
      },
    );

    expect(transferService.create).toHaveBeenCalledWith('user-123', {
      fromAccountId: 'a1111111-1111-4111-8111-111111111111',
      toAccountId: 'a2222222-2222-4222-8222-222222222222',
      amount: 100.0,
      transactionAt: new Date('2026-09-13T15:30:00.000Z'),
    });
    expect(result).toEqual({
      success: true,
      data: mockTransfer,
    });
  });

  it('should handle service errors gracefully', async () => {
    (transferService.create as jest.Mock).mockRejectedValue(
      new BadRequestException('Insufficient balance for transfer'),
    );

    const result = await tool.execute(
      { userId: 'user-123' },
      {
        fromAccountId: 'a1111111-1111-4111-8111-111111111111',
        toAccountId: 'a2222222-2222-4222-8222-222222222222',
        amount: 100000.0,
        transactionAt: '2026-09-13T15:30:00.000Z',
      },
    );

    expect(result).toEqual({
      success: false,
      error: 'Insufficient balance for transfer',
    });
  });
});
