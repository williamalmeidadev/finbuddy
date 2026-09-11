import { ApiProperty } from '@nestjs/swagger';

export class AgentResponseDto {
  @ApiProperty({
    description: 'AI assistant text response',
    example: 'Hello! I am FinBuddy, your personal finance assistant...',
  })
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
