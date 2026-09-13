import { Test, TestingModule } from '@nestjs/testing';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { RecurringTransactionExecutionResponseDto } from './dto/recurring-transaction-execution-response.dto';
import { RecurringTransactionExecutionController } from './recurring-transaction-execution.controller';
import { RecurringTransactionExecutionService } from './recurring-transaction-execution.service';

describe('RecurringTransactionExecutionController', () => {
  let controller: RecurringTransactionExecutionController;
  let service: {
    execute: jest.Mock;
  };

  const user: AuthenticatedUserDto = {
    id: 'user-1',
    email: 'user@example.com',
    status: 'ACTIVE',
  };

  beforeEach(async () => {
    service = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringTransactionExecutionController],
      providers: [
        {
          provide: RecurringTransactionExecutionService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<RecurringTransactionExecutionController>(
      RecurringTransactionExecutionController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('execute', () => {
    it('should call service.execute with query or body until date', async () => {
      const expectedResponse = new RecurringTransactionExecutionResponseDto({
        processed: 2,
        created: 2,
        skipped: 0,
        deactivated: 0,
      });

      service.execute.mockResolvedValue(expectedResponse);

      const result = await controller.execute(
        user,
        { until: '2026-09-10' },
        {},
      );

      expect(service.execute).toHaveBeenCalledWith('user-1', {
        until: '2026-09-10',
      });
      expect(result).toEqual(expectedResponse);
    });
  });
});
