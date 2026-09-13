import { ApiProperty } from '@nestjs/swagger';
import { CategoryType } from '../../generated/prisma/enums';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'Unique category identifier (UUID)',
    example: 'c1d2e3f4-a5b6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Owner user ID (UUID)',
    example: 'u1v2w3x4-y5z6-7890-abcd-ef1234567890',
  })
  userId: string;

  @ApiProperty({
    description: 'Category display name',
    example: 'Groceries',
  })
  name: string;

  @ApiProperty({
    description: 'Category transaction type',
    enum: CategoryType,
    example: 'EXPENSE',
  })
  type: CategoryType;

  @ApiProperty({
    description: 'Icon slug or identifier',
    nullable: true,
    example: 'shopping-cart',
  })
  icon: string | null;

  @ApiProperty({
    description: 'Hex color code',
    nullable: true,
    example: '#FF5733',
  })
  color: string | null;

  @ApiProperty({
    description: 'Whether the category is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Category creation timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Category last update timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
  updatedAt: Date;

  constructor(category: {
    id: string;
    userId: string;
    name: string;
    type: CategoryType;
    icon: string | null;
    color: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = category.id;
    this.userId = category.userId;
    this.name = category.name;
    this.type = category.type;
    this.icon = category.icon;
    this.color = category.color;
    this.isActive = category.isActive;
    this.createdAt = category.createdAt;
    this.updatedAt = category.updatedAt;
  }
}
