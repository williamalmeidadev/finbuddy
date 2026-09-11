import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendAgentMessageDto {
  @ApiProperty({
    description: 'User message or prompt for the AI assistant',
    example: 'Hello FinBuddy, how can you help me with my finances?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
