import { Injectable } from '@nestjs/common';

import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(data: {
    email: string;
    passwordHash: string;
  }) {
    return this.userRepository.create(data);
  }

  async findById(id: string) {
    return this.userRepository.findById(id);
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }
}