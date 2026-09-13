import { Test, TestingModule } from '@nestjs/testing';
import { AgentToolRegistryService } from './agent-tool-registry.service';
import { GetAccountsTool } from './impl/get-accounts.tool';
import { GetTransactionsTool } from './impl/get-transactions.tool';
import { GetFinancialSummaryTool } from './impl/get-financial-summary.tool';
import { GetBudgetsTool } from './impl/get-budgets.tool';
import { CreateTransactionTool } from './impl/create-transaction.tool';
import { SaveMemoryTool } from './impl/save-memory.tool';
import { UpdateTransactionTool } from './impl/update-transaction.tool';
import { DeleteTransactionTool } from './impl/delete-transaction.tool';
import { CreateTransferTool } from './impl/create-transfer.tool';

describe('AgentToolRegistryService', () => {
  let service: AgentToolRegistryService;

  const mockGetAccountsTool = {
    name: 'get_accounts',
    description: 'Get accounts',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as GetAccountsTool;

  const mockGetTransactionsTool = {
    name: 'get_transactions',
    description: 'Get transactions',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as GetTransactionsTool;

  const mockGetFinancialSummaryTool = {
    name: 'get_financial_summary',
    description: 'Get summary',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as GetFinancialSummaryTool;

  const mockGetBudgetsTool = {
    name: 'get_budgets',
    description: 'Get budgets',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as GetBudgetsTool;

  const mockCreateTransactionTool = {
    name: 'create_transaction',
    description: 'Create transaction',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as CreateTransactionTool;

  const mockSaveMemoryTool = {
    name: 'save_memory',
    description: 'Save memory',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as SaveMemoryTool;

  const mockUpdateTransactionTool = {
    name: 'update_transaction',
    description: 'Update transaction',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as UpdateTransactionTool;

  const mockDeleteTransactionTool = {
    name: 'delete_transaction',
    description: 'Delete transaction',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as DeleteTransactionTool;

  const mockCreateTransferTool = {
    name: 'create_transfer',
    description: 'Create transfer',
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  } as unknown as CreateTransferTool;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentToolRegistryService,
        { provide: GetAccountsTool, useValue: mockGetAccountsTool },
        { provide: GetTransactionsTool, useValue: mockGetTransactionsTool },
        {
          provide: GetFinancialSummaryTool,
          useValue: mockGetFinancialSummaryTool,
        },
        { provide: GetBudgetsTool, useValue: mockGetBudgetsTool },
        { provide: CreateTransactionTool, useValue: mockCreateTransactionTool },
        { provide: SaveMemoryTool, useValue: mockSaveMemoryTool },
        { provide: UpdateTransactionTool, useValue: mockUpdateTransactionTool },
        { provide: DeleteTransactionTool, useValue: mockDeleteTransactionTool },
        { provide: CreateTransferTool, useValue: mockCreateTransferTool },
      ],
    }).compile();

    service = module.get<AgentToolRegistryService>(AgentToolRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should register all nine tools on initialization', () => {
      service.onModuleInit();
      const tools = service.getTools();
      expect(tools).toHaveLength(9);
      expect(service.getTool('get_accounts')).toBe(mockGetAccountsTool);
      expect(service.getTool('get_transactions')).toBe(mockGetTransactionsTool);
      expect(service.getTool('get_financial_summary')).toBe(
        mockGetFinancialSummaryTool,
      );
      expect(service.getTool('get_budgets')).toBe(mockGetBudgetsTool);
      expect(service.getTool('create_transaction')).toBe(
        mockCreateTransactionTool,
      );
      expect(service.getTool('save_memory')).toBe(mockSaveMemoryTool);
      expect(service.getTool('update_transaction')).toBe(
        mockUpdateTransactionTool,
      );
      expect(service.getTool('delete_transaction')).toBe(
        mockDeleteTransactionTool,
      );
      expect(service.getTool('create_transfer')).toBe(mockCreateTransferTool);
    });
  });

  describe('getTool', () => {
    it('should return undefined if tool does not exist', () => {
      expect(service.getTool('non_existent')).toBeUndefined();
    });

    it('should return registered tool by name', () => {
      service.onModuleInit();
      expect(service.getTool('get_accounts')).toBe(mockGetAccountsTool);
      expect(service.getTool('create_transaction')).toBe(
        mockCreateTransactionTool,
      );
      expect(service.getTool('save_memory')).toBe(mockSaveMemoryTool);
      expect(service.getTool('update_transaction')).toBe(
        mockUpdateTransactionTool,
      );
      expect(service.getTool('delete_transaction')).toBe(
        mockDeleteTransactionTool,
      );
      expect(service.getTool('create_transfer')).toBe(mockCreateTransferTool);
    });
  });

  describe('getToolDefinitions', () => {
    it('should return empty array if no tools are registered', () => {
      expect(service.getToolDefinitions()).toEqual([]);
    });

    it('should return mapped tool definitions in OpenAI function format', () => {
      service.onModuleInit();

      const definitions = service.getToolDefinitions();
      expect(definitions).toHaveLength(9);
      expect(definitions[0]).toEqual({
        type: 'function',
        name: 'get_accounts',
        description: 'Get accounts',
        parameters: { type: 'object', properties: {} },
      });
    });
  });
});
