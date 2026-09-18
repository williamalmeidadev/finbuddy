import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({
    description:
      'Refresh token (sent via HttpOnly cookie; this body field is ignored)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  refreshToken?: string;
}
