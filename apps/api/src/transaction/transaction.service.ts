import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountRepository } from '../account/account.repository';
import { CategoryRepository } from '../category/category.repository';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionRepository } from './transaction.repository';

interface PrismaDecimal {
  toNumber(): number;
}

import { BudgetAlertsService } from '../budget-alerts/budget-alerts.service';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly budgetAlertsService: BudgetAlertsService,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const account = await this.accountRepository.findByIdAndUserId(
      dto.accountId,
      userId,
    );

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (!account.isActive) {
      throw new BadRequestException(
        'Cannot create transaction for an inactive account',
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

    const balanceDelta =
      dto.type === TransactionType.INCOME ? dto.amount : -dto.amount;

    const transaction =
      await this.transactionRepository.createWithBalanceUpdate(
        {
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          source: dto.source ?? TransactionSource.MANUAL,
          transactionAt: dto.transactionAt,
        },
        balanceDelta,
      );

    let budgetAlert = null;
    if (dto.type === TransactionType.EXPENSE && dto.categoryId) {
      budgetAlert = await this.budgetAlertsService.evaluateTransactionAlert(
        userId,
        dto.categoryId,
        dto.transactionAt,
      );
    }

    return new TransactionResponseDto(transaction, budgetAlert);
  }

  async findByUserId(
    userId: string,
    query?: TransactionQueryDto,
  ): Promise<TransactionResponseDto[]> {
    if (query?.accountId) {
      const account = await this.accountRepository.findByIdAndUserId(
        query.accountId,
        userId,
      );

      if (!account) {
        throw new NotFoundException('Account not found');
      }
    }

    if (query?.categoryId) {
      const category = await this.categoryRepository.findByIdAndUserId(
        query.categoryId,
        userId,
      );

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    const transactions = await this.transactionRepository.findByUserId(userId, {
      accountId: query?.accountId,
      categoryId: query?.categoryId,
      month: query?.month,
      limit: query?.limit,
      offset: query?.offset,
    });

    return transactions.map((t) => new TransactionResponseDto(t));
  }

  async findById(id: string, userId: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findByIdAndUserId(
      id,
      userId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return new TransactionResponseDto(transaction);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTransactionDto,
  ): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findByIdAndUserId(
      id,
      userId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (
      transaction.source === TransactionSource.SYSTEM ||
      Boolean(transaction.transferId)
    ) {
      throw new BadRequestException(
        'Cannot modify transfer-linked or system transactions',
      );
    }

    const currentAccount = await this.accountRepository.findByIdAndUserId(
      transaction.accountId,
      userId,
    );

    if (!currentAccount || !currentAccount.isActive) {
      throw new BadRequestException(
        'Cannot update transaction for an inactive account',
      );
    }

    if (
      dto.accountId !== undefined &&
      dto.accountId !== transaction.accountId
    ) {
      const targetAccount = await this.accountRepository.findByIdAndUserId(
        dto.accountId,
        userId,
      );

      if (!targetAccount) {
        throw new NotFoundException('Account not found');
      }

      if (!targetAccount.isActive) {
        throw new BadRequestException('Cannot assign an inactive account');
      }
    }

    const newType = dto.type ?? transaction.type;

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

        if ((category.type as string) !== (newType as string)) {
          throw new BadRequestException(
            'Category type does not match transaction type',
          );
        }
      }
    } else if (dto.type !== undefined && transaction.categoryId) {
      const category = await this.categoryRepository.findByIdAndUserId(
        transaction.categoryId,
        userId,
      );

      if (category && (category.type as string) !== (newType as string)) {
        throw new BadRequestException(
          'Category type does not match transaction type',
        );
      }
    }

    const oldAmount = this.toNumber(transaction.amount);
    const oldImpact =
      transaction.type === TransactionType.INCOME ? oldAmount : -oldAmount;

    const newAmount = dto.amount ?? oldAmount;
    const newImpact =
      newType === TransactionType.INCOME ? newAmount : -newAmount;

    let balanceDelta = 0;
    let accountChange:
      | {
          oldAccountId: string;
          oldAccountReversalDelta: number;
          newAccountId: string;
          newAccountDelta: number;
        }
      | undefined;

    if (
      dto.accountId !== undefined &&
      dto.accountId !== transaction.accountId
    ) {
      accountChange = {
        oldAccountId: transaction.accountId,
        oldAccountReversalDelta: -oldImpact,
        newAccountId: dto.accountId,
        newAccountDelta: newImpact,
      };
    } else {
      balanceDelta = newImpact - oldImpact;
    }

    const updated = await this.transactionRepository.updateWithBalanceUpdate(
      id,
      userId,
      {
        ...(dto.accountId !== undefined ? { accountId: dto.accountId } : {}),
        ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.source ? { source: dto.source } : {}),
        ...(dto.transactionAt ? { transactionAt: dto.transactionAt } : {}),
      },
      balanceDelta,
      accountChange,
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    let budgetAlert = null;
    if (updated.type === TransactionType.EXPENSE && updated.categoryId) {
      budgetAlert = await this.budgetAlertsService.evaluateTransactionAlert(
        userId,
        updated.categoryId,
        updated.transactionAt,
      );
    }

    return new TransactionResponseDto(updated, budgetAlert);
  }

  async delete(id: string, userId: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findByIdAndUserId(
      id,
      userId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (
      transaction.source === TransactionSource.SYSTEM ||
      Boolean(transaction.transferId)
    ) {
      throw new BadRequestException(
        'Cannot delete transfer-linked or system transactions',
      );
    }

    const account = await this.accountRepository.findByIdAndUserId(
      transaction.accountId,
      userId,
    );

    if (!account || !account.isActive) {
      throw new BadRequestException(
        'Cannot delete transaction for an inactive account',
      );
    }

    const currentAmount = this.toNumber(transaction.amount);
    const currentImpact =
      transaction.type === TransactionType.INCOME
        ? currentAmount
        : -currentAmount;

    const reversalDelta = -currentImpact;

    const deleted = await this.transactionRepository.deleteWithBalanceUpdate(
      id,
      userId,
      reversalDelta,
    );

    if (!deleted) {
      throw new NotFoundException('Transaction not found');
    }

    return new TransactionResponseDto(deleted);
  }

  private toNumber(value: PrismaDecimal | number): number {
    return typeof value === 'number' ? value : value.toNumber();
  }
}
