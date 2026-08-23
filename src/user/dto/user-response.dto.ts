import { UserStatus } from '../../generated/prisma/enums';

export class UserResponseDto {
  id: string;
  email: string;
  status: UserStatus;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;

  constructor(user: {
    id: string;
    email: string;
    status: UserStatus;
    emailVerifiedAt: Date | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = user.id;
    this.email = user.email;
    this.status = user.status;
    this.emailVerifiedAt = user.emailVerifiedAt;
    this.lastLoginAt = user.lastLoginAt;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
  }
}