import { Test, TestingModule } from '@nestjs/testing';
import { RecurringTransactionExecutionResponseDto } from '../recurring-transaction-execution/dto/recurring-transaction-execution-response.dto';
import { RecurringTransactionAutomationScheduler } from './recurring-transaction-automation.scheduler';
import { RecurringTransactionAutomationService } from './recurring-transaction-automation.service';

describe('RecurringTransactionAutomationScheduler', () => {
  let scheduler: RecurringTransactionAutomationScheduler;
  let automationService: {
    isEnabled: jest.Mock;
    runAutomation: jest.Mock;
  };

  beforeEach(async () => {
    automationService = {
      isEnabled: jest.fn(),
      runAutomation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecurringTransactionAutomationScheduler,
        {
          provide: RecurringTransactionAutomationService,
          useValue: automationService,
        },
      ],
    }).compile();

    scheduler = module.get<RecurringTransactionAutomationScheduler>(
      RecurringTransactionAutomationScheduler,
    );
  });

  it('should be defined', () => {
    expect(scheduler).toBeDefined();
  });

  it('should log startup status onModuleInit', () => {
    automationService.isEnabled.mockReturnValue(true);
    expect(() => scheduler.onModuleInit()).not.toThrow();

    automationService.isEnabled.mockReturnValue(false);
    expect(() => scheduler.onModuleInit()).not.toThrow();
  });

  describe('handleCron', () => {
    it('should do nothing if automation is disabled', async () => {
      automationService.isEnabled.mockReturnValue(false);

      await scheduler.handleCron();

      expect(automationService.runAutomation).not.toHaveBeenCalled();
    });

    it('should trigger automationService.runAutomation if enabled', async () => {
      automationService.isEnabled.mockReturnValue(true);
      automationService.runAutomation.mockResolvedValue(
        new RecurringTransactionExecutionResponseDto({ processed: 2 }),
      );

      await scheduler.handleCron();

      expect(automationService.runAutomation).toHaveBeenCalled();
    });

    it('should skip tick if previous automation cycle is currently running', async () => {
      automationService.isEnabled.mockReturnValue(true);

      let resolveAutomation: (val: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolveAutomation = resolve;
      });
      automationService.runAutomation.mockReturnValue(pendingPromise);

      // Start first cycle
      const firstTick = scheduler.handleCron();

      // Attempt second cycle while first is executing
      await scheduler.handleCron();

      // Finish first cycle
      resolveAutomation!(new RecurringTransactionExecutionResponseDto());
      await firstTick;

      // runAutomation should only have been called once
      expect(automationService.runAutomation).toHaveBeenCalledTimes(1);
    });
  });
});
