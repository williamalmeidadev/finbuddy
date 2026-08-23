import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { PasswordModule } from '../password/password.module';
import { UserController } from './user.controller';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

@Module({
  imports: [PrismaModule, PasswordModule],
  controllers: [UserController],
  providers: [UserRepository, UserService],
  exports: [UserService, UserRepository],
})
export class UserModule {}
