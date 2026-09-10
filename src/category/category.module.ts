import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { CategoryController } from './category.controller';
import { CategoryRepository } from './category.repository';
import { CategoryService } from './category.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CategoryController],
  providers: [CategoryRepository, CategoryService],
  exports: [CategoryService, CategoryRepository],
})
export class CategoryModule {}
