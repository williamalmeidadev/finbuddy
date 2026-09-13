import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AiMemoryType } from '../../generated/prisma/enums';

export class CreateMemoryDto {
  @ApiProperty({
    enum: AiMemoryType,
    example: 'PREFERENCE',
    description: 'Memory category/type',
  })
  @IsEnum(AiMemoryType)
  type: AiMemoryType;

  @ApiProperty({
    example: 'preferred_currency',
    description: 'Memory key name',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({
    example: 'BRL',
    description: 'Memory value',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  value: string;
}

export class UpdateMemoryDto {
  @ApiProperty({
    example: 'USD',
    description: 'Updated memory value',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  value: string;
}

export class ListMemoriesQueryDto {
  @ApiPropertyOptional({
    enum: AiMemoryType,
    description: 'Optional memory type filter',
  })
  @IsOptional()
  @IsEnum(AiMemoryType)
  type?: AiMemoryType;
}

export class MemoryResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  userId: string;

  @ApiProperty({ enum: AiMemoryType, example: 'PREFERENCE' })
  type: string;

  @ApiProperty({ example: 'preferred_currency' })
  key: string;

  @ApiProperty({ example: 'BRL' })
  value: string;

  @ApiProperty({ example: '2026-09-13T12:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-09-13T12:05:00.000Z' })
  updatedAt: Date;
}
