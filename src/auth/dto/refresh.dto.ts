import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token issued during login or previous token refresh',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}
