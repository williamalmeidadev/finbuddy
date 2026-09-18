import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class SendAgentMessageDto {
  @ApiProperty({
    description: 'User message or prompt for the AI assistant',
    example: 'Hello FinBuddy, how can you help me with my finances?',
    maxLength: 1000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000, {
    message: 'A mensagem não pode exceder 1000 caracteres.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Optional UUID of an existing conversation to continue',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
