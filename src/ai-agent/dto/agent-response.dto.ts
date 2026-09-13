import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentConfirmationDetail } from '../domain/agent-response';

export class AgentResponseDto {
  @ApiProperty({
    description: 'AI assistant text response',
    example: 'Hello! I am FinBuddy, your personal finance assistant...',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Response type (response or confirmation_required)',
    enum: ['response', 'confirmation_required'],
    example: 'response',
  })
  type?: 'response' | 'confirmation_required';

  @ApiPropertyOptional({
    description:
      'Structured confirmation action details when type is confirmation_required',
  })
  confirmation?: AgentConfirmationDetail;

  @ApiPropertyOptional({
    description: 'UUID of the conversation associated with this message',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  conversationId?: string;

  constructor(
    message: string,
    type: 'response' | 'confirmation_required' = 'response',
    confirmation?: AgentConfirmationDetail,
    conversationId?: string,
  ) {
    this.message = message;
    this.type = type;
    this.confirmation = confirmation;
    this.conversationId = conversationId;
  }
}
