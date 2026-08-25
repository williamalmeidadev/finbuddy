import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { PasswordModule } from '../password/password.module';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [DatabaseModule, PasswordModule],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository],
})
export class UserModule {}
