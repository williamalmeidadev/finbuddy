import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_SECRET: string;

  @IsNumber()
  @IsNotEmpty()
  PORT: number;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'info';

  @IsBoolean()
  @IsOptional()
  RECURRING_TRANSACTION_AUTOMATION_ENABLED?: boolean = true;

  @IsString()
  @IsOptional()
  RECURRING_TRANSACTION_AUTOMATION_CRON?: string = '* * * * *';

  @IsNumber()
  @IsOptional()
  THROTTLE_TTL?: number = 60000;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT?: number = 100;

  @IsNumber()
  @IsOptional()
  THROTTLE_AUTH_LIMIT?: number = 10;
}

export function validate(config: Record<string, any>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(`Config validation error: ${errors.toString()}`);
  }
  return validatedConfig;
}
