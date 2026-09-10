import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountRepository } from '../account/account.repository';
import { CategoryRepository } from '../category/category.repository';
import { ExecuteRecurringTransactionDto } from './dto/execute-recurring-transaction.dto';
import { RecurringTransactionExecutionResponseDto } from './dto/recurring-transaction-execution-response.dto';
import { RecurringTransactionExecutionRepository } from './recurring-transaction-execution.repository';

@Injectable()
export class RecurringTransactionExecutionService {
  private readonly MAX_OCCURRENCES_PER_DEFINITION = 100;

  constructor(
    private readonly repository: RecurringTransactionExecutionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async execute(
    userId: string,
    dto?: ExecuteRecurringTransactionDto,
  ): Promise<RecurringTransactionExecutionResponseDto> {
    const untilDate = this.parseUntilDate(dto?.until);
    const dueList = await this.repository.findDueRecurringTransactions(
      userId,
      untilDate,
    );

    let totalProcessed = 0;
    let totalCreated = 0;
    let totalSkipped = 0;
    let totalDeactivated = 0;

    for (const item of dueList) {
      let currentItem = item;
      let occurrencesForDef = 0;

      while (
        currentItem.isActive &&
        currentItem.nextOccurrence <= untilDate &&
        occurrencesForDef < this.MAX_OCCURRENCES_PER_DEFINITION
      ) {
        const account = await this.accountRepository.findByIdAndUserId(
          currentItem.accountId,
          userId,
        );

        if (!account || !account.isActive) {
          break;
        }

        let categoryIdToUse: string | null = null;
        if (currentItem.categoryId) {
          const category = await this.categoryRepository.findByIdAndUserId(
            currentItem.categoryId,
            userId,
          );

          if (
            category &&
            category.isActive &&
            (category.type as string) === (currentItem.type as string)
          ) {
            categoryIdToUse = currentItem.categoryId;
          }
        }

        try {
          const result = await this.repository.processOccurrence(
            currentItem,
            categoryIdToUse,
          );

          totalProcessed++;
          if (result.created) totalCreated++;
          if (result.skipped) totalSkipped++;
          if (result.deactivated) {
            totalDeactivated++;
            break;
          }

          currentItem = result.updatedRecurring;
          occurrencesForDef++;
        } catch {
          break;
        }
      }
    }

    return new RecurringTransactionExecutionResponseDto({
      processed: totalProcessed,
      created: totalCreated,
      skipped: totalSkipped,
      deactivated: totalDeactivated,
    });
  }

  private parseUntilDate(untilStr?: string): Date {
    if (!untilStr) {
      const now = new Date();
      return new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate(),
          23,
          59,
          59,
          999,
        ),
      );
    }

    const cleanStr = untilStr.split('T')[0];
    const parts = cleanStr.split('-').map((v) => parseInt(v, 10));

    if (parts.length < 3 || parts.some((p) => isNaN(p))) {
      throw new BadRequestException('Invalid date format for until parameter');
    }

    const [year, month, day] = parts;
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
  }
}
