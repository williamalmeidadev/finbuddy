import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryRepository } from '../category/category.repository';
import { CategoryType } from '../generated/prisma/enums';
import { BudgetRepository } from './budget.repository';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { BudgetResponseDto } from './dto/budget-response.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Injectable()
export class BudgetService {
  constructor(
    private readonly budgetRepository: BudgetRepository,
    private readonly categoryRepository: CategoryRepository,
  ) {}

  async create(
    userId: string,
    dto: CreateBudgetDto,
  ): Promise<BudgetResponseDto> {
    if (dto.amount <= 0) {
      throw new BadRequestException('Budget amount must be greater than zero');
    }

    const category = await this.categoryRepository.findByIdAndUserId(
      dto.categoryId,
      userId,
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if ((category.type as string) !== (CategoryType.EXPENSE as string)) {
      throw new BadRequestException(
        'Budgets can only be created for EXPENSE categories',
      );
    }

    if (!category.isActive) {
      throw new BadRequestException(
        'Cannot create budget for an inactive category',
      );
    }

    const monthDate = this.normalizeMonth(dto.month);

    const existing = await this.budgetRepository.findByCategoryMonthAndUserId(
      dto.categoryId,
      monthDate,
      userId,
    );

    if (existing) {
      throw new ConflictException(
        'A budget for this category and month already exists',
      );
    }

    const budget = await this.budgetRepository.create({
      userId,
      categoryId: dto.categoryId,
      amount: dto.amount,
      month: monthDate,
    });

    const spent = await this.budgetRepository.calculateSpending(
      userId,
      budget.categoryId,
      budget.month,
    );

    return new BudgetResponseDto(budget, spent);
  }

  async findByUserId(
    userId: string,
    query?: BudgetQueryDto,
  ): Promise<BudgetResponseDto[]> {
    const monthDate = query?.month
      ? this.normalizeMonth(query.month)
      : undefined;

    const budgets = await this.budgetRepository.findByUserId(userId, {
      categoryId: query?.categoryId,
      month: monthDate,
    });

    if (budgets.length === 0) {
      return [];
    }

    const spendingMap = await this.budgetRepository.calculateSpendingBatch(
      userId,
      budgets,
    );

    return budgets.map((budget) => {
      const spent =
        spendingMap.get(`${budget.categoryId}:${budget.month.toISOString()}`) ??
        spendingMap.get(`${budget.categoryId}:${budget.month.getTime()}`) ??
        0;
      return new BudgetResponseDto(budget, spent);
    });
  }

  async findById(id: string, userId: string): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepository.findByIdAndUserId(id, userId);

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    const spent = await this.budgetRepository.calculateSpending(
      userId,
      budget.categoryId,
      budget.month,
    );

    return new BudgetResponseDto(budget, spent);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateBudgetDto,
  ): Promise<BudgetResponseDto> {
    if (dto.amount <= 0) {
      throw new BadRequestException('Budget amount must be greater than zero');
    }

    const existing = await this.budgetRepository.findByIdAndUserId(id, userId);

    if (!existing) {
      throw new NotFoundException('Budget not found');
    }

    const updated = await this.budgetRepository.update(id, userId, {
      amount: dto.amount,
    });

    if (!updated) {
      throw new NotFoundException('Budget not found');
    }

    const spent = await this.budgetRepository.calculateSpending(
      userId,
      updated.categoryId,
      updated.month,
    );

    return new BudgetResponseDto(updated, spent);
  }

  async delete(id: string, userId: string): Promise<BudgetResponseDto> {
    const existing = await this.budgetRepository.findByIdAndUserId(id, userId);

    if (!existing) {
      throw new NotFoundException('Budget not found');
    }

    const deleted = await this.budgetRepository.delete(id, userId);

    if (!deleted) {
      throw new NotFoundException('Budget not found');
    }

    const spent = await this.budgetRepository.calculateSpending(
      userId,
      deleted.categoryId,
      deleted.month,
    );

    return new BudgetResponseDto(deleted, spent);
  }

  private normalizeMonth(monthStr: string): Date {
    const match = monthStr.match(/^(\d{4})-(0[1-9]|1[0-2])/);
    if (!match) {
      throw new BadRequestException('Invalid month format');
    }

    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;

    return new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  }
}
