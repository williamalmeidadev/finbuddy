import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountRepository } from '../account/account.repository';
import { TransactionSource, TransactionType } from '../generated/prisma/enums';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { TransactionResponseDto } from './dto/transaction-response.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { TransactionRepository } from './transaction.repository';

interface PrismaDecimal {
  toNumber(): number;
}

@Injectable()
export class TransactionService {
  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly accountRepository: AccountRepository,
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

    const balanceDelta =
      dto.type === TransactionType.INCOME ? dto.amount : -dto.amount;

    const transaction =
      await this.transactionRepository.createWithBalanceUpdate(
        {
          accountId: dto.accountId,
          type: dto.type,
          amount: dto.amount,
          description: dto.description,
          source: dto.source ?? TransactionSource.MANUAL,
          transactionAt: dto.transactionAt,
        },
        balanceDelta,
      );

    return new TransactionResponseDto(transaction);
  }

  async findByUserId(
    userId: string,
    accountId?: string,
  ): Promise<TransactionResponseDto[]> {
    if (accountId) {
      const account = await this.accountRepository.findByIdAndUserId(
        accountId,
        userId,
      );

      if (!account) {
        throw new NotFoundException('Account not found');
      }
    }

    const transactions = await this.transactionRepository.findByUserId(
      userId,
      accountId,
    );

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

    const account = await this.accountRepository.findByIdAndUserId(
      transaction.accountId,
      userId,
    );

    if (!account || !account.isActive) {
      throw new BadRequestException(
        'Cannot update transaction for an inactive account',
      );
    }

    const oldAmount = this.toNumber(transaction.amount);
    const oldImpact =
      transaction.type === TransactionType.INCOME ? oldAmount : -oldAmount;

    const newType = dto.type ?? transaction.type;
    const newAmount = dto.amount ?? oldAmount;
    const newImpact =
      newType === TransactionType.INCOME ? newAmount : -newAmount;

    const balanceDelta = newImpact - oldImpact;

    const updated = await this.transactionRepository.updateWithBalanceUpdate(
      id,
      userId,
      {
        ...(dto.type ? { type: dto.type } : {}),
        ...(dto.amount !== undefined ? { amount: dto.amount } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
        ...(dto.source ? { source: dto.source } : {}),
        ...(dto.transactionAt ? { transactionAt: dto.transactionAt } : {}),
      },
      balanceDelta,
    );

    if (!updated) {
      throw new NotFoundException('Transaction not found');
    }

    return new TransactionResponseDto(updated);
  }

  async delete(id: string, userId: string): Promise<TransactionResponseDto> {
    const transaction = await this.transactionRepository.findByIdAndUserId(
      id,
      userId,
    );

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
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
