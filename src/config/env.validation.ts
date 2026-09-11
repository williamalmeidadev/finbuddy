import { Transform, plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

const toBoolean = ({
  obj,
  key,
  value,
}: {
  obj: Record<string, unknown>;
  key: string;
  value: unknown;
}) => {
  const raw = obj && key in obj ? obj[key] : value;
  if (typeof raw === 'boolean') {
    return raw;
  }
  if (typeof raw === 'string') {
    const val = raw.trim().toLowerCase();
    if (val === 'false' || val === '0' || val === 'off' || val === 'no') {
      return false;
    }
    if (val === 'true' || val === '1' || val === 'on' || val === 'yes') {
      return true;
    }
  }
  return value;
};

class EnvironmentVariables {
  @IsEnum(['development', 'production', 'test'])
  @IsOptional()
  NODE_ENV?: 'development' | 'production' | 'test' = 'development';

  @Transform(toBoolean)
  @IsBoolean()
  @IsOptional()
  SWAGGER_ENABLED?: boolean = true;

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

  @Transform(toBoolean)
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

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  OPENAI_MODEL?: string = 'gpt-5.5';

  @IsNumber()
  @IsOptional()
  OPENAI_TIMEOUT_MS?: number = 30000;
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
