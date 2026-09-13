import { ApiProperty } from '@nestjs/swagger';
import { UserStatus } from '../../generated/prisma/enums';

export class UserResponseDto {
  @ApiProperty({
    description: 'Unique user ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Account status',
    enum: UserStatus,
    example: 'ACTIVE',
  })
  status: UserStatus;

  @ApiProperty({
    description: 'Timestamp when email was verified',
    nullable: true,
    example: null,
  })
  emailVerifiedAt: Date | null;

  @ApiProperty({
    description: 'Timestamp of user last login',
    nullable: true,
    example: '2026-03-15T12:00:00.000Z',
  })
  lastLoginAt: Date | null;

  @ApiProperty({
    description: 'Account creation timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Account last update timestamp',
    example: '2026-01-01T00:00:00.000Z',
  })
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
