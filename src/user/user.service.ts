import { Injectable } from '@nestjs/common';

import { PasswordService } from '../auth/password.service';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
  ) {}

  async createUser(data: {
    email: string;
    password: string;
  }) {
    const passwordHash = await this.passwordService.hash(data.password);

    return this.userRepository.create({
      email: data.email,
      passwordHash,
    });
  }

  async findById(id: string) {
    return this.userRepository.findById(id);
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }
}