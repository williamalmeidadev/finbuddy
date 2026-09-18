import 'reflect-metadata';
import { validate } from './env.validation';

describe('Environment Validation', () => {
  const validMinimalConfig = {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
    JWT_SECRET: 'supersecretjwtkey12345',
    PORT: '3000',
  };

  it('should successfully validate a minimal valid configuration and apply defaults', () => {
    const config = validate(validMinimalConfig);

    expect(config.DATABASE_URL).toBe(validMinimalConfig.DATABASE_URL);
    expect(config.JWT_SECRET).toBe(validMinimalConfig.JWT_SECRET);
    expect(config.PORT).toBe(3000);

    // Default values
    expect(config.NODE_ENV).toBe('development');
    expect(config.SWAGGER_ENABLED).toBe(true);
    expect(config.LOG_LEVEL).toBe('info');
    expect(config.RECURRING_TRANSACTION_AUTOMATION_ENABLED).toBe(true);
    expect(config.RECURRING_TRANSACTION_AUTOMATION_CRON).toBe('* * * * *');
    expect(config.THROTTLE_TTL).toBe(60000);
    expect(config.THROTTLE_LIMIT).toBe(1000);
    expect(config.THROTTLE_AUTH_LIMIT).toBe(200);
  });

  it('should apply OpenAI environment variable defaults when omitted', () => {
    const config = validate({
      DATABASE_URL:
        'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
      JWT_SECRET: 'testsecret123',
      PORT: 3000,
    });

    expect(config.OPENAI_MODEL).toBe('gpt-4o-mini');
    expect(config.OPENAI_TIMEOUT_MS).toBe(30000);
  });

  it('should accept custom values for OpenAI configuration', () => {
    const config = validate({
      ...validMinimalConfig,
      OPENAI_API_KEY: 'sk-test-key-12345',
      OPENAI_MODEL: 'gpt-4o',
      OPENAI_TIMEOUT_MS: '15000',
    });

    expect(config.OPENAI_API_KEY).toBe('sk-test-key-12345');
    expect(config.OPENAI_MODEL).toBe('gpt-4o');
    expect(config.OPENAI_TIMEOUT_MS).toBe(15000);
  });

  it('should accept custom values for optional fields', () => {
    const customConfig = {
      ...validMinimalConfig,
      JWT_SECRET: 'a_very_strong_production_jwt_secret_key_1234567890',
      NODE_ENV: 'production',
      SWAGGER_ENABLED: false,
      CORS_ORIGIN: 'https://app.finbuddy.com',
      LOG_LEVEL: 'warn',
      RECURRING_TRANSACTION_AUTOMATION_ENABLED: false,
      RECURRING_TRANSACTION_AUTOMATION_CRON: '0 0 * * *',
      THROTTLE_TTL: '30000',
      THROTTLE_LIMIT: '50',
      THROTTLE_AUTH_LIMIT: '5',
    };

    const config = validate(customConfig);

    expect(config.NODE_ENV).toBe('production');
    expect(config.SWAGGER_ENABLED).toBe(false);
    expect(config.CORS_ORIGIN).toBe('https://app.finbuddy.com');
    expect(config.LOG_LEVEL).toBe('warn');
    expect(config.RECURRING_TRANSACTION_AUTOMATION_ENABLED).toBe(false);
    expect(config.RECURRING_TRANSACTION_AUTOMATION_CRON).toBe('0 0 * * *');
    expect(config.THROTTLE_TTL).toBe(30000);
    expect(config.THROTTLE_LIMIT).toBe(50);
    expect(config.THROTTLE_AUTH_LIMIT).toBe(5);
  });

  it('should accept test environment for NODE_ENV', () => {
    const config = validate({
      ...validMinimalConfig,
      NODE_ENV: 'test',
    });

    expect(config.NODE_ENV).toBe('test');
  });

  it('should coerce string values "false" and "0" to boolean false for SWAGGER_ENABLED and automation', () => {
    const config = validate({
      ...validMinimalConfig,
      SWAGGER_ENABLED: 'false',
      RECURRING_TRANSACTION_AUTOMATION_ENABLED: '0',
    });

    expect(config.SWAGGER_ENABLED).toBe(false);
    expect(config.RECURRING_TRANSACTION_AUTOMATION_ENABLED).toBe(false);
  });

  it('should throw an error if DATABASE_URL is missing', () => {
    const invalidConfig = {
      JWT_SECRET: validMinimalConfig.JWT_SECRET,
      PORT: validMinimalConfig.PORT,
    };

    expect(() => validate(invalidConfig)).toThrow(/DATABASE_URL/);
  });

  it('should throw an error if JWT_SECRET is missing', () => {
    const invalidConfig = {
      DATABASE_URL: validMinimalConfig.DATABASE_URL,
      PORT: validMinimalConfig.PORT,
    };

    expect(() => validate(invalidConfig)).toThrow(/JWT_SECRET/);
  });

  it('should throw an error if PORT is missing', () => {
    const invalidConfig = {
      DATABASE_URL: validMinimalConfig.DATABASE_URL,
      JWT_SECRET: validMinimalConfig.JWT_SECRET,
    };

    expect(() => validate(invalidConfig)).toThrow(/PORT/);
  });

  it('should throw an error if NODE_ENV is not one of development, production, test', () => {
    expect(() =>
      validate({
        ...validMinimalConfig,
        NODE_ENV: 'staging',
      }),
    ).toThrow(/NODE_ENV/);
  });
});
