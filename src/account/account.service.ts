import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountResponseDto } from './dto/account-response.dto';
import { AccountRepository } from './account.repository';

@Injectable()
export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  async create(userId: string, dto: CreateAccountDto): Promise<AccountResponseDto> {
    const account = await this.accountRepository.create({
      userId,
      name: dto.name,
      type: dto.type,
      balance: dto.balance ?? 0,
      currency: dto.currency ?? 'BRL',
      color: dto.color,
      isActive: dto.isActive ?? true,
    });

    return new AccountResponseDto(account);
  }

  async findById(id: string, userId: string): Promise<AccountResponseDto> {
    const account = await this.accountRepository.findById(id);

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.userId !== userId) {
      throw new ForbiddenException('You can only access your own accounts');
    }

    return new AccountResponseDto(account);
  }

  async findByUserId(userId: string): Promise<AccountResponseDto[]> {
    const accounts = await this.accountRepository.findByUserId(userId);
    return accounts.map((acc) => new AccountResponseDto(acc));
  }
}
