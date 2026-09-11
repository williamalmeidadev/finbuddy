import { Test, TestingModule } from '@nestjs/testing';
import { AgentToolRegistryService } from './agent-tool-registry.service';
import { AgentTool } from './agent-tool.interface';

describe('AgentToolRegistryService', () => {
  let service: AgentToolRegistryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentToolRegistryService],
    }).compile();

    service = module.get<AgentToolRegistryService>(AgentToolRegistryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getTools', () => {
    it('should return empty array by default', () => {
      expect(service.getTools()).toEqual([]);
    });

    it('should return all registered tools', () => {
      const mockTool1: AgentTool = {
        name: 'test_tool_1',
        description: 'First test tool',
        parameters: { type: 'object', properties: {} },
        execute: jest.fn().mockResolvedValue({ success: true }),
      };
      const mockTool2: AgentTool = {
        name: 'test_tool_2',
        description: 'Second test tool',
        parameters: {
          type: 'object',
          properties: { param: { type: 'string' } },
        },
        execute: jest.fn().mockResolvedValue({ success: true }),
      };

      service.registerTool(mockTool1);
      service.registerTool(mockTool2);

      const tools = service.getTools();
      expect(tools).toHaveLength(2);
      expect(tools).toContain(mockTool1);
      expect(tools).toContain(mockTool2);
    });
  });

  describe('getTool', () => {
    it('should return undefined if tool does not exist', () => {
      expect(service.getTool('non_existent')).toBeUndefined();
    });

    it('should return registered tool by name', () => {
      const mockTool: AgentTool = {
        name: 'get_balance',
        description: 'Get user balance',
        parameters: { type: 'object', properties: {} },
        execute: jest.fn().mockResolvedValue({ userId: 'user-1' }),
      };

      service.registerTool(mockTool);
      expect(service.getTool('get_balance')).toBe(mockTool);
    });
  });

  describe('getToolDefinitions', () => {
    it('should return empty array if no tools are registered', () => {
      expect(service.getToolDefinitions()).toEqual([]);
    });

    it('should return mapped tool definitions in OpenAI function format', () => {
      const mockTool: AgentTool = {
        name: 'get_financial_summary',
        description: 'Returns the user financial summary',
        parameters: {
          type: 'object',
          properties: {
            period: { type: 'string', description: 'Monthly or yearly' },
          },
          required: ['period'],
        },
        execute: jest.fn(),
      };

      service.registerTool(mockTool);

      const definitions = service.getToolDefinitions();
      expect(definitions).toEqual([
        {
          type: 'function',
          name: 'get_financial_summary',
          description: 'Returns the user financial summary',
          parameters: {
            type: 'object',
            properties: {
              period: { type: 'string', description: 'Monthly or yearly' },
            },
            required: ['period'],
          },
        },
      ]);
    });
  });
});
