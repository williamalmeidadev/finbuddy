import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AccountRepository } from '../account/account.repository';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { UpdateTransferDto } from './dto/update-transfer.dto';
import { TransferQueryDto } from './dto/transfer-query.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';
import { TransferRepository } from './transfer.repository';

interface PrismaDecimal {
  toNumber(): number;
}

@Injectable()
export class TransferService {
  constructor(
    private readonly transferRepository: TransferRepository,
    private readonly accountRepository: AccountRepository,
  ) {}

  async create(
    userId: string,
    dto: CreateTransferDto,
  ): Promise<TransferResponseDto> {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException(
        'Source and destination accounts must be different',
      );
    }

    const fromAccount = await this.accountRepository.findByIdAndUserId(
      dto.fromAccountId,
      userId,
    );
    const toAccount = await this.accountRepository.findByIdAndUserId(
      dto.toAccountId,
      userId,
    );

    if (!fromAccount || !toAccount) {
      throw new NotFoundException('Account not found');
    }

    if (!fromAccount.isActive || !toAccount.isActive) {
      throw new BadRequestException(
        'Cannot perform transfer with an inactive account',
      );
    }

    if (fromAccount.currency !== toAccount.currency) {
      throw new BadRequestException(
        'Transfers between different currencies are not supported',
      );
    }

    const fromBalance = this.toNumber(fromAccount.balance);
    if (fromBalance < dto.amount) {
      throw new BadRequestException('Insufficient balance for transfer');
    }

    const transfer =
      await this.transferRepository.createWithAtomicBalanceUpdate(
        {
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount: dto.amount,
          transactionAt: dto.transactionAt,
        },
        fromAccount.name,
        toAccount.name,
      );

    return new TransferResponseDto(transfer);
  }

  async update(
    transferId: string,
    userId: string,
    dto: UpdateTransferDto,
  ): Promise<TransferResponseDto> {
    // Validate that at least one field is being updated
    if (
      dto.amount === undefined &&
      dto.transactionAt === undefined &&
      dto.fromAccountId === undefined &&
      dto.toAccountId === undefined
    ) {
      throw new BadRequestException(
        'At least one field to update must be provided',
      );
    }

    // Fetch current transfer to determine effective account IDs
    const current = await this.transferRepository.findByIdAndUserId(
      transferId,
      userId,
    );

    if (!current) {
      throw new NotFoundException('Transfer not found');
    }

    const effectiveFromAccountId = dto.fromAccountId ?? current.fromAccountId;
    const effectiveToAccountId = dto.toAccountId ?? current.toAccountId;

    if (effectiveFromAccountId === effectiveToAccountId) {
      throw new BadRequestException(
        'Source and destination accounts must be different',
      );
    }

    // Validate accounts when they change or we need to confirm they still exist
    if (dto.fromAccountId || dto.toAccountId) {
      const fromAccount = await this.accountRepository.findByIdAndUserId(
        effectiveFromAccountId,
        userId,
      );
      const toAccount = await this.accountRepository.findByIdAndUserId(
        effectiveToAccountId,
        userId,
      );

      if (!fromAccount || !toAccount) {
        throw new NotFoundException('Account not found');
      }

      if (!fromAccount.isActive || !toAccount.isActive) {
        throw new BadRequestException(
          'Cannot perform transfer with an inactive account',
        );
      }

      if (fromAccount.currency !== toAccount.currency) {
        throw new BadRequestException(
          'Transfers between different currencies are not supported',
        );
      }
    }

    const transfer =
      await this.transferRepository.updateWithAtomicBalanceUpdate(
        transferId,
        userId,
        {
          amount: dto.amount,
          transactionAt: dto.transactionAt,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
        },
      );

    return new TransferResponseDto(transfer);
  }

  async findByUserId(
    userId: string,
    query?: TransferQueryDto,
  ): Promise<TransferResponseDto[]> {
    if (query?.fromAccountId) {
      const fromAccount = await this.accountRepository.findByIdAndUserId(
        query.fromAccountId,
        userId,
      );
      if (!fromAccount) {
        throw new NotFoundException('Account not found');
      }
    }

    if (query?.toAccountId) {
      const toAccount = await this.accountRepository.findByIdAndUserId(
        query.toAccountId,
        userId,
      );
      if (!toAccount) {
        throw new NotFoundException('Account not found');
      }
    }

    const transfers = await this.transferRepository.findByUserId(userId, {
      fromAccountId: query?.fromAccountId,
      toAccountId: query?.toAccountId,
      limit: query?.limit,
      offset: query?.offset,
    });

    return transfers.map((t) => new TransferResponseDto(t));
  }

  async findById(id: string, userId: string): Promise<TransferResponseDto> {
    const transfer = await this.transferRepository.findByIdAndUserId(
      id,
      userId,
    );

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    return new TransferResponseDto(transfer);
  }

  private toNumber(value: PrismaDecimal | number): number {
    return typeof value === 'number' ? value : value.toNumber();
  }
}
