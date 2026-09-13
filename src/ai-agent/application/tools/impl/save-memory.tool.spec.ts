import { Test, TestingModule } from '@nestjs/testing';
import { SaveMemoryTool } from './save-memory.tool';
import { AiMemoryService } from '../../memory/ai-memory.service';
import { AgentCapability } from '../../authorization/agent-capability.enum';
import { AgentToolRiskLevel } from '../agent-tool.interface';

describe('SaveMemoryTool', () => {
  let tool: SaveMemoryTool;
  let mockMemoryService: {
    saveMemory: jest.Mock;
  };

  beforeEach(async () => {
    mockMemoryService = {
      saveMemory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SaveMemoryTool,
        {
          provide: AiMemoryService,
          useValue: mockMemoryService,
        },
      ],
    }).compile();

    tool = module.get<SaveMemoryTool>(SaveMemoryTool);
  });

  it('should be defined with correct metadata', () => {
    expect(tool).toBeDefined();
    expect(tool.name).toBe('save_memory');
    expect(tool.capability).toBe(AgentCapability.MANAGE_MEMORY);
    expect(tool.riskLevel).toBe(AgentToolRiskLevel.LOW);
    expect(tool.readOnly).toBe(false);
    expect(tool.requiresConfirmation).toBe(false);
  });

  it('should call memoryService.saveMemory and return success result', async () => {
    const mockMemory = {
      id: 'mem-1',
      userId: 'user-1',
      type: 'PREFERENCE',
      key: 'preferred_currency',
      value: 'BRL',
    };
    mockMemoryService.saveMemory.mockResolvedValue(mockRecord(mockMemory));

    const result = await tool.execute(
      { userId: 'user-1', requestId: 'req-1' },
      { type: 'PREFERENCE', key: 'preferred_currency', value: 'BRL' },
    );

    expect(mockMemoryService.saveMemory).toHaveBeenCalledWith(
      'user-1',
      'PREFERENCE',
      'preferred_currency',
      'BRL',
      { requestId: 'req-1', aiRequestId: undefined },
    );
    expect(result).toEqual({
      success: true,
      data: {
        id: 'mem-1',
        type: 'PREFERENCE',
        key: 'preferred_currency',
        value: 'BRL',
      },
    });
  });

  function mockRecord(data: any) {
    return { ...data, createdAt: new Date(), updatedAt: new Date() };
  }
});
