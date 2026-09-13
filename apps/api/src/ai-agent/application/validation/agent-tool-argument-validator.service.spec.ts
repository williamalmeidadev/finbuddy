import { Test, TestingModule } from '@nestjs/testing';
import { AgentToolArgumentValidatorService } from './agent-tool-argument-validator.service';

describe('AgentToolArgumentValidatorService', () => {
  let service: AgentToolArgumentValidatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentToolArgumentValidatorService],
    }).compile();

    service = module.get<AgentToolArgumentValidatorService>(
      AgentToolArgumentValidatorService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('get_accounts validation', () => {
    it('should pass for empty object {}', async () => {
      const res = await service.validate('get_accounts', {});
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it('should fail if unexpected properties (e.g. userId injection) are present', async () => {
      const res = await service.validate('get_accounts', {
        userId: 'hacker-user-id',
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('userId'))).toBe(true);
    });
  });

  describe('get_transactions validation', () => {
    it('should pass for valid parameters', async () => {
      const res = await service.validate('get_transactions', {
        accountId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        limit: 20,
        offset: 0,
      });
      expect(res.valid).toBe(true);
    });

    it('should fail if accountId is not a valid UUID', async () => {
      const res = await service.validate('get_transactions', {
        accountId: 'invalid-uuid-string',
      });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes('UUID'))).toBe(true);
    });

    it('should fail if limit exceeds 100', async () => {
      const res = await service.validate('get_transactions', {
        limit: 500,
      });
      expect(res.valid).toBe(false);
    });

    it('should fail if limit is less than 1', async () => {
      const res = await service.validate('get_transactions', {
        limit: 0,
      });
      expect(res.valid).toBe(false);
    });
  });

  describe('get_financial_summary validation', () => {
    it('should pass for valid YYYY-MM month', async () => {
      const res = await service.validate('get_financial_summary', {
        month: '2026-09',
      });
      expect(res.valid).toBe(true);
    });

    it('should fail for invalid month format', async () => {
      const res = await service.validate('get_financial_summary', {
        month: '2026-13',
      });
      expect(res.valid).toBe(false);
    });
  });

  describe('get_budgets validation', () => {
    it('should pass for valid categoryId and month', async () => {
      const res = await service.validate('get_budgets', {
        categoryId: 'b1b2c3d4-e5f6-7890-abcd-ef1234567890',
        month: '2026-05',
      });
      expect(res.valid).toBe(true);
    });

    it('should fail for invalid categoryId UUID', async () => {
      const res = await service.validate('get_budgets', {
        categoryId: 'not-a-uuid',
      });
      expect(res.valid).toBe(false);
    });
  });

  describe('malformed input handling', () => {
    it('should reject invalid JSON string', async () => {
      const res = await service.validate('get_accounts', '{ bad json ');
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('valid JSON object');
    });

    it('should reject non-object inputs like arrays or numbers', async () => {
      const res = await service.validate('get_accounts', [1, 2, 3]);
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain('non-null JSON object');
    });
  });
});
