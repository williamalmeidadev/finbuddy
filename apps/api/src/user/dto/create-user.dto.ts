import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  EMAIL_REGEX,
  sanitizeEmail,
  sanitizeString,
} from '../../common/utils/input-sanitizer.util';

export class CreateUserDto {
  @ApiProperty({
    description: 'User email address (max 254 characters)',
    example: 'user@example.com',
    maxLength: 254,
  })
  @Transform(({ value }: { value: unknown }) => sanitizeEmail(value))
  @IsString()
  @IsNotEmpty({ message: 'Email must not be empty' })
  @MaxLength(254, { message: 'Email address must not exceed 254 characters' })
  @IsEmail(
    { allow_utf8_local_part: false },
    { message: 'Invalid email address format' },
  )
  @Matches(EMAIL_REGEX, {
    message: 'Email address contains invalid format or characters',
  })
  email!: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters, max 128 characters)',
    example: 'StrongPassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @Transform(({ value }: { value: unknown }) => sanitizeString(value))
  @IsString()
  @IsNotEmpty({ message: 'Password must not be empty' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  password!: string;
}
