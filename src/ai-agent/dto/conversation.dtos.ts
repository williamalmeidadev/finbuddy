import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateConversationDto {
  @ApiPropertyOptional({
    description: 'Optional human-readable title for the conversation',
    example: 'September 2026 Budgeting',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class ListConversationsQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (default 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page limit (default 10, max 50)',
    example: 10,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}

export class ListMessagesQueryDto {
  @ApiPropertyOptional({
    description: 'Page number (default 1)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Page limit (default 20, max 100)',
    example: 20,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class ConversationResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiPropertyOptional({ example: 'Monthly Expenses Planning', nullable: true })
  title?: string | null;

  @ApiProperty({ example: '2026-09-13T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-13T12:05:00.000Z' })
  updatedAt: Date;
}

export class ConversationMessageResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  conversationId: string;

  @ApiProperty({ enum: ['USER', 'ASSISTANT'], example: 'USER' })
  role: string;

  @ApiProperty({ example: 'How much did I spend this month?' })
  content: string;

  @ApiProperty({ example: 1 })
  sequenceNumber: number;

  @ApiProperty({ example: '2026-09-13T12:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedConversationsResponseDto {
  @ApiProperty({ type: [ConversationResponseDto] })
  items: ConversationResponseDto[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}

export class PaginatedMessagesResponseDto {
  @ApiProperty({ type: [ConversationMessageResponseDto] })
  items: ConversationMessageResponseDto[];

  @ApiProperty({ example: 1 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
