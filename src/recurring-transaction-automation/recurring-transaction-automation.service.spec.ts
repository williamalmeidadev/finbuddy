import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { RecurringTransactionExecutionResponseDto } from '../recurring-transaction-execution/dto/recurring-transaction-execution-response.dto';
import { RecurringTransactionExecutionService } from '../recurring-transaction-execution/recurring-transaction-execution.service';
import { RecurringTransactionAutomationService } from './recurring-transaction-automation.service';

describe('RecurringTransactionAutomationService', () => {
  let service: RecurringTransactionAutomationService;
  let configService: {
    get: jest.Mock;
  };
  let executionService: {
    executeAllDue: jest.Mock;
  };

  beforeEach(async () => {
    configService = {
      get: jest.fn(),
    };
    executionService = {
      executeAllDue: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionAutomationService,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: RecurringTransactionExecutionService,
          useValue: executionService,
        },
      ],
    }).compile();

    service = module.get<RecurringTransactionAutomationService>(
      RecurringTransactionAutomationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isEnabled', () => {
    it('should return true when config is true or boolean true', () => {
      configService.get.mockReturnValue(true);
      expect(service.isEnabled()).toBe(true);

      configService.get.mockReturnValue('true');
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when config is false', () => {
      configService.get.mockReturnValue(false);
      expect(service.isEnabled()).toBe(false);

      configService.get.mockReturnValue('false');
      expect(service.isEnabled()).toBe(false);
    });
  });

  describe('runAutomation', () => {
    it('should not invoke execution engine when disabled', async () => {
      configService.get.mockReturnValue(false);

      const result = await service.runAutomation();

      expect(executionService.executeAllDue).not.toHaveBeenCalled();
      expect(result).toEqual(new RecurringTransactionExecutionResponseDto());
    });

    it('should invoke execution engine and return aggregated metrics when enabled', async () => {
      configService.get.mockReturnValue(true);
      const expectedMetrics = new RecurringTransactionExecutionResponseDto({
        processed: 5,
        created: 4,
        skipped: 1,
        deactivated: 1,
      });

      executionService.executeAllDue.mockResolvedValue(expectedMetrics);

      const result = await service.runAutomation();

      expect(executionService.executeAllDue).toHaveBeenCalled();
      expect(result).toEqual(expectedMetrics);
    });

    it('should isolate execution failure and return empty response without crashing', async () => {
      configService.get.mockReturnValue(true);
      executionService.executeAllDue.mockRejectedValue(
        new Error('Database error'),
      );

      const result = await service.runAutomation();

      expect(result).toEqual(new RecurringTransactionExecutionResponseDto());
    });
  });
});
