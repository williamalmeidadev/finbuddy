import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountRepository } from '../account/account.repository';
import { CategoryRepository } from '../category/category.repository';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { RecurringTransactionQueryDto } from './dto/recurring-transaction-query.dto';
import { RecurringTransactionResponseDto } from './dto/recurring-transaction-response.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import { RecurringTransactionRepository } from './recurring-transaction.repository';

@Injectable()
export class RecurringTransactionService {
  constructor(
    private readonly repository: RecurringTransactionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async create(
    userId: string,
    dto: CreateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const account = await this.accountRepository.findByIdAndUserId(
      dto.accountId,
      userId,
    );

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (!account.isActive) {
      throw new BadRequestException(
        'Cannot create recurring transaction for an inactive account',
      );
    }

    if (dto.categoryId) {
      const category = await this.categoryRepository.findByIdAndUserId(
        dto.categoryId,
        userId,
      );

      if (!category) {
        throw new NotFoundException('Category not found');
      }

      if (!category.isActive) {
        throw new BadRequestException('Cannot assign an inactive category');
      }

      if ((category.type as string) !== (dto.type as string)) {
        throw new BadRequestException(
          'Category type does not match transaction type',
        );
      }
    }

    const startDate = this.parseDate(dto.startDate);
    const endDate = dto.endDate ? this.parseDate(dto.endDate) : null;

    if (endDate && endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    const created = await this.repository.create({
      userId,
      accountId: dto.accountId,
      categoryId: dto.categoryId,
      type: dto.type,
      amount: dto.amount,
      description: dto.description,
      frequency: dto.frequency,
      startDate,
      nextOccurrence: startDate,
      endDate,
    });

    return new RecurringTransactionResponseDto(created);
  }

  async findByUserId(
    userId: string,
    query?: RecurringTransactionQueryDto,
  ): Promise<RecurringTransactionResponseDto[]> {
    const list = await this.repository.findByUserId(userId, query);
    return list.map((item) => new RecurringTransactionResponseDto(item));
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<RecurringTransactionResponseDto> {
    const item = await this.repository.findByIdAndUserId(id, userId);

    if (!item) {
      throw new NotFoundException('Recurring transaction not found');
    }

    return new RecurringTransactionResponseDto(item);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateRecurringTransactionDto,
  ): Promise<RecurringTransactionResponseDto> {
    const existing = await this.repository.findByIdAndUserId(id, userId);

    if (!existing) {
      throw new NotFoundException('Recurring transaction not found');
    }

    if (dto.amount !== undefined && dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const targetAccountId = dto.accountId ?? existing.accountId;

    if (dto.accountId !== undefined) {
      const account = await this.accountRepository.findByIdAndUserId(
        targetAccountId,
        userId,
      );

      if (!account) {
        throw new NotFoundException('Account not found');
      }

      if (!account.isActive) {
        throw new BadRequestException('Cannot assign an inactive account');
      }
    }

    const targetType = dto.type ?? existing.type;

    if (dto.categoryId !== undefined) {
      if (dto.categoryId !== null) {
        const category = await this.categoryRepository.findByIdAndUserId(
          dto.categoryId,
          userId,
        );

        if (!category) {
          throw new NotFoundException('Category not found');
        }

        if (!category.isActive) {
          throw new BadRequestException('Cannot assign an inactive category');
        }

        if ((category.type as string) !== (targetType as string)) {
          throw new BadRequestException(
            'Category type does not match transaction type',
          );
        }
      }
    } else if (dto.type !== undefined && existing.categoryId) {
      const category = await this.categoryRepository.findByIdAndUserId(
        existing.categoryId,
        userId,
      );

      if (category && (category.type as string) !== (targetType as string)) {
        throw new BadRequestException(
          'Category type does not match transaction type',
        );
      }
    }

    const startDate = dto.startDate
      ? this.parseDate(dto.startDate)
      : existing.startDate;

    const endDate =
      dto.endDate !== undefined
        ? dto.endDate
          ? this.parseDate(dto.endDate)
          : null
        : existing.endDate;

    if (endDate && endDate < startDate) {
      throw new BadRequestException('End date cannot be before start date');
    }

    let nextOccurrence = existing.nextOccurrence;
    if (
      dto.startDate !== undefined ||
      dto.frequency !== undefined ||
      dto.endDate !== undefined
    ) {
      nextOccurrence = startDate;
    }

    const updated = await this.repository.update(id, userId, {
      ...(dto.accountId ? { accountId: dto.accountId } : {}),
      ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
      ...(dto.type ? { type: dto.type } : {}),
      ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description }
        : {}),
      ...(dto.frequency ? { frequency: dto.frequency } : {}),
      ...(dto.startDate ? { startDate } : {}),
      ...(dto.startDate !== undefined ||
      dto.frequency !== undefined ||
      dto.endDate !== undefined
        ? { nextOccurrence }
        : {}),
      ...(dto.endDate !== undefined ? { endDate } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });

    if (!updated) {
      throw new NotFoundException('Recurring transaction not found');
    }

    return new RecurringTransactionResponseDto(updated);
  }

  async deactivate(
    id: string,
    userId: string,
  ): Promise<RecurringTransactionResponseDto> {
    const existing = await this.repository.findByIdAndUserId(id, userId);

    if (!existing) {
      throw new NotFoundException('Recurring transaction not found');
    }

    const deactivated = await this.repository.deactivate(id, userId);

    if (!deactivated) {
      throw new NotFoundException('Recurring transaction not found');
    }

    return new RecurringTransactionResponseDto(deactivated);
  }

  private parseDate(dateStr: string): Date {
    const [year, month, day] = dateStr.split('-').map((v) => parseInt(v, 10));
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }
}
