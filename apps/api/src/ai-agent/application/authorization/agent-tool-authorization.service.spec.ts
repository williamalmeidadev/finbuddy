import { Test, TestingModule } from '@nestjs/testing';
import { AgentToolAuthorizationService } from './agent-tool-authorization.service';
import { AgentCapability } from './agent-capability.enum';
import { AgentTool, AgentToolRiskLevel } from '../tools/agent-tool.interface';

describe('AgentToolAuthorizationService', () => {
  let service: AgentToolAuthorizationService;

  const validTool: AgentTool = {
    name: 'get_accounts',
    description: 'Get accounts',
    capability: AgentCapability.READ_ACCOUNTS,
    riskLevel: AgentToolRiskLevel.LOW,
    readOnly: true,
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  };

  const toolWithUnknownCapability: AgentTool = {
    name: 'dangerous_tool',
    description: 'Dangerous tool',
    capability: 'UNREGISTERED_CAPABILITY' as AgentCapability,
    riskLevel: AgentToolRiskLevel.HIGH,
    readOnly: false,
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  };

  const toolWithoutCapability: AgentTool = {
    name: 'naked_tool',
    description: 'Naked tool',
    capability: undefined as any,
    riskLevel: AgentToolRiskLevel.LOW,
    readOnly: true,
    inputSchema: { type: 'object', properties: {} },
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentToolAuthorizationService],
    }).compile();

    service = module.get<AgentToolAuthorizationService>(
      AgentToolAuthorizationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('authorize', () => {
    it('should authorize valid tool execution for an authenticated user', () => {
      const decision = service.authorize('user-123', validTool);
      expect(decision.authorized).toBe(true);
      expect(decision.reason).toBeUndefined();
    });

    it('should deny authorization if userId is missing or empty', () => {
      const decision1 = service.authorize('', validTool);
      expect(decision1.authorized).toBe(false);
      expect(decision1.reason).toBe('Invalid authentication context');

      const decision2 = service.authorize(null as any, validTool);
      expect(decision2.authorized).toBe(false);
    });

    it('should deny authorization if tool lacks capability declaration', () => {
      const decision = service.authorize('user-123', toolWithoutCapability);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toBe('Tool missing capability declaration');
    });

    it('should deny authorization for unregistered/unauthorized capability', () => {
      const decision = service.authorize('user-123', toolWithUnknownCapability);
      expect(decision.authorized).toBe(false);
      expect(decision.reason).toContain('is not authorized');
    });
  });
});
