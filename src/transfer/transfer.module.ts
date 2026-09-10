import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module';
import { DatabaseModule } from '../database/database.module';
import { TransferController } from './transfer.controller';
import { TransferRepository } from './transfer.repository';
import { TransferService } from './transfer.service';

@Module({
  imports: [DatabaseModule, AccountModule],
  controllers: [TransferController],
  providers: [TransferRepository, TransferService],
  exports: [TransferService, TransferRepository],
})
export class TransferModule {}
