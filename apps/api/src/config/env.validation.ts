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
  THROTTLE_LIMIT?: number = 1000;

  @IsNumber()
  @IsOptional()
  THROTTLE_AUTH_LIMIT?: number = 200;

  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  OPENAI_MODEL?: string = 'gpt-4o-mini';

  @IsNumber()
  @IsOptional()
  OPENAI_TIMEOUT_MS?: number = 60000;

  @IsNumber()
  @IsOptional()
  AI_CONFIRMATION_TTL_SECONDS?: number = 300;

  @IsNumber()
  @IsOptional()
  AI_THROTTLE_TTL?: number = 60000;

  @IsNumber()
  @IsOptional()
  AI_THROTTLE_LIMIT?: number = 100;

  @IsNumber()
  @IsOptional()
  OPENAI_MAX_TOOL_ITERATIONS?: number = 15;

  @IsNumber()
  @IsOptional()
  OPENAI_MAX_MODEL_CALLS?: number = 25;

  @IsNumber()
  @IsOptional()
  OPENAI_MAX_OUTPUT_TOKENS?: number = 2500;

  @IsNumber()
  @IsOptional()
  AI_MAX_INPUT_CHARS?: number = 4000;

  @IsNumber()
  @IsOptional()
  AI_MAX_CONTEXT_CHARS?: number = 30000;

  @IsNumber()
  @IsOptional()
  AI_MAX_MEMORY_CONTEXT_CHARS?: number = 2000;

  @IsNumber()
  @IsOptional()
  AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD?: number = 5;

  @IsNumber()
  @IsOptional()
  AI_CIRCUIT_BREAKER_RESET_TIMEOUT_MS?: number = 30000;

  @IsNumber()
  @IsOptional()
  AI_MAX_CONCURRENT_REQUESTS_PER_USER?: number = 3;
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

  // Production Security Hardening
  if (validatedConfig.NODE_ENV === 'production') {
    if (
      validatedConfig.JWT_SECRET === 'your_jwt_secret_here' ||
      validatedConfig.JWT_SECRET === 'supersecretjwtkey' ||
      validatedConfig.JWT_SECRET.length < 32
    ) {
      throw new Error(
        'Config validation error: JWT_SECRET must be at least 32 characters long and cannot use default placeholders in production',
      );
    }
  }

  // Production Hardening Validations
  if (
    validatedConfig.OPENAI_TIMEOUT_MS !== undefined &&
    validatedConfig.OPENAI_TIMEOUT_MS <= 0
  ) {
    throw new Error(
      'Config validation error: OPENAI_TIMEOUT_MS must be greater than 0',
    );
  }
  if (
    validatedConfig.AI_THROTTLE_TTL !== undefined &&
    validatedConfig.AI_THROTTLE_TTL <= 0
  ) {
    throw new Error(
      'Config validation error: AI_THROTTLE_TTL must be greater than 0',
    );
  }
  if (
    validatedConfig.AI_THROTTLE_LIMIT !== undefined &&
    validatedConfig.AI_THROTTLE_LIMIT <= 0
  ) {
    throw new Error(
      'Config validation error: AI_THROTTLE_LIMIT must be greater than 0',
    );
  }
  if (
    validatedConfig.OPENAI_MAX_TOOL_ITERATIONS !== undefined &&
    validatedConfig.OPENAI_MAX_TOOL_ITERATIONS <= 0
  ) {
    throw new Error(
      'Config validation error: OPENAI_MAX_TOOL_ITERATIONS must be greater than 0',
    );
  }
  if (
    validatedConfig.OPENAI_MAX_MODEL_CALLS !== undefined &&
    validatedConfig.OPENAI_MAX_MODEL_CALLS <= 0
  ) {
    throw new Error(
      'Config validation error: OPENAI_MAX_MODEL_CALLS must be greater than 0',
    );
  }
  if (
    validatedConfig.OPENAI_MAX_OUTPUT_TOKENS !== undefined &&
    validatedConfig.OPENAI_MAX_OUTPUT_TOKENS <= 0
  ) {
    throw new Error(
      'Config validation error: OPENAI_MAX_OUTPUT_TOKENS must be greater than 0',
    );
  }
  if (
    validatedConfig.AI_MAX_INPUT_CHARS !== undefined &&
    validatedConfig.AI_MAX_INPUT_CHARS <= 0
  ) {
    throw new Error(
      'Config validation error: AI_MAX_INPUT_CHARS must be greater than 0',
    );
  }
  if (
    validatedConfig.AI_MAX_CONTEXT_CHARS !== undefined &&
    validatedConfig.AI_MAX_CONTEXT_CHARS <= 0
  ) {
    throw new Error(
      'Config validation error: AI_MAX_CONTEXT_CHARS must be greater than 0',
    );
  }
  if (
    validatedConfig.AI_MAX_MEMORY_CONTEXT_CHARS !== undefined &&
    validatedConfig.AI_MAX_MEMORY_CONTEXT_CHARS <= 0
  ) {
    throw new Error(
      'Config validation error: AI_MAX_MEMORY_CONTEXT_CHARS must be greater than 0',
    );
  }
  if (
    validatedConfig.AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD !== undefined &&
    validatedConfig.AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD <= 0
  ) {
    throw new Error(
      'Config validation error: AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD must be greater than 0',
    );
  }
  if (
    validatedConfig.AI_CIRCUIT_BREAKER_RESET_TIMEOUT_MS !== undefined &&
    validatedConfig.AI_CIRCUIT_BREAKER_RESET_TIMEOUT_MS <= 0
  ) {
    throw new Error(
      'Config validation error: AI_CIRCUIT_BREAKER_RESET_TIMEOUT_MS must be greater than 0',
    );
  }
  if (
    validatedConfig.AI_MAX_CONCURRENT_REQUESTS_PER_USER !== undefined &&
    validatedConfig.AI_MAX_CONCURRENT_REQUESTS_PER_USER <= 0
  ) {
    throw new Error(
      'Config validation error: AI_MAX_CONCURRENT_REQUESTS_PER_USER must be greater than 0',
    );
  }

  return validatedConfig;
}
