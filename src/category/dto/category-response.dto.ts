import { CategoryType } from '../../generated/prisma/enums';

export class CategoryResponseDto {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  icon: string | null;
  color: string | null;
  isActive: boolean;
  createdAt: Date;
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
