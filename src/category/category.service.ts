import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CategoryRepository } from './category.repository';
import { CategoryQueryDto } from './dto/category-query.dto';
import { CategoryResponseDto } from './dto/category-response.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private readonly categoryRepository: CategoryRepository) {}

  async create(
    userId: string,
    dto: CreateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const normalizedName = dto.name.trim();

    const existing = await this.categoryRepository.findByNameAndUserId(
      normalizedName,
      userId,
      dto.type,
    );

    if (existing && existing.isActive) {
      throw new ConflictException(
        'Category with this name and type already exists',
      );
    }

    const category = await this.categoryRepository.create({
      userId,
      name: normalizedName,
      type: dto.type,
      icon: dto.icon,
      color: dto.color,
      isActive: dto.isActive ?? true,
    });

    return new CategoryResponseDto(category);
  }

  async findByUserId(
    userId: string,
    query?: CategoryQueryDto,
  ): Promise<CategoryResponseDto[]> {
    const categories = await this.categoryRepository.findByUserId(
      userId,
      query,
    );

    return categories.map((c) => new CategoryResponseDto(c));
  }

  async findById(id: string, userId: string): Promise<CategoryResponseDto> {
    const category = await this.categoryRepository.findByIdAndUserId(
      id,
      userId,
    );

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return new CategoryResponseDto(category);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateCategoryDto,
  ): Promise<CategoryResponseDto> {
    const current = await this.categoryRepository.findByIdAndUserId(id, userId);

    if (!current) {
      throw new NotFoundException('Category not found');
    }

    const newName = dto.name ? dto.name.trim() : current.name;
    const newType = dto.type ?? current.type;

    if (newName !== current.name || newType !== current.type) {
      const existing = await this.categoryRepository.findByNameAndUserId(
        newName,
        userId,
        newType,
      );

      if (existing && existing.id !== id && existing.isActive) {
        throw new ConflictException(
          'Category with this name and type already exists',
        );
      }
    }

    const updated = await this.categoryRepository.update(id, userId, {
      ...(dto.name !== undefined ? { name: newName } : {}),
      ...(dto.type !== undefined ? { type: dto.type } : {}),
      ...(dto.icon !== undefined ? { icon: dto.icon } : {}),
      ...(dto.color !== undefined ? { color: dto.color } : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });

    if (!updated) {
      throw new NotFoundException('Category not found');
    }

    return new CategoryResponseDto(updated);
  }

  async deactivate(id: string, userId: string): Promise<CategoryResponseDto> {
    const deactivated = await this.categoryRepository.deactivate(id, userId);

    if (!deactivated) {
      throw new NotFoundException('Category not found');
    }

    return new CategoryResponseDto(deactivated);
  }
}
