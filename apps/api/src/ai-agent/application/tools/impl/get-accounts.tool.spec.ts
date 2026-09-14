import { Test, TestingModule } from '@nestjs/testing';
import { GetAccountsTool } from './get-accounts.tool';
import { AccountService } from '../../../../account/account.service';
import { AccountType } from '../../../../generated/prisma/enums';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('GetAccountsTool', () => {
  let tool: GetAccountsTool;

  const mockAccountService = {
    findByUserId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAccountsTool,
        {
          provide: AccountService,
          useValue: mockAccountService,
        },
      ],
    }).compile();

    tool = module.get<GetAccountsTool>(GetAccountsTool);
  });

  it('should be defined with correct name, metadata, and schema', () => {
    expect(tool.name).toBe('get_accounts');
    expect(tool.capability).toBe(AgentCapability.READ_ACCOUNTS);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.LOW);
    expect(tool.readOnly).toBe(true);
    expect(tool.inputSchema).toBeDefined();
    expect(tool.inputSchema.additionalProperties).toBe(false);
  });

  it('should return accounts for authenticated user context', async () => {
    const mockAccounts = [
      {
        id: 'acc-1',
        userId: 'user-123',
        name: 'Checking',
        type: AccountType.CHECKING,
        balance: 1000.5,
        currency: 'BRL',
        color: '#FFFFFF',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    mockAccountService.findByUserId.mockResolvedValue(mockAccounts);

    const result = await tool.execute({ userId: 'user-123' });

    expect(mockAccountService.findByUserId).toHaveBeenCalledWith('user-123');
    expect(result).toEqual({
      success: true,
      data: {
        totalBalance: 1000.5,
        activeAccountsCount: 1,
        accounts: [
          {
            id: 'acc-1',
            name: 'Checking',
            type: AccountType.CHECKING,
            balance: 1000.5,
            currency: 'BRL',
            color: '#FFFFFF',
            isActive: true,
          },
        ],
      },
    });
  });

  it('should handle service errors safely without crashing', async () => {
    mockAccountService.findByUserId.mockRejectedValue(
      new Error('Database error'),
    );

    const result = await tool.execute({ userId: 'user-123' });

    expect(result).toEqual({
      success: false,
      error: 'Database error',
    });
  });
});
