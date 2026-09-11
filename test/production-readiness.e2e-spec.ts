import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import helmet from 'helmet';
import { execSync } from 'child_process';
import net from 'net';
import { AppModule } from '../src/app.module';
import { validate } from '../src/config/env.validation';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

const originalUrl = process.env.DATABASE_URL;
let testDbUrl: string;
try {
  let formattedUrl = originalUrl;
  if (formattedUrl.includes('@postgres:')) {
    formattedUrl = formattedUrl.replace('@postgres:', '@localhost:');
  } else if (formattedUrl.includes('@postgres/')) {
    formattedUrl = formattedUrl.replace('@postgres/', '@localhost/');
  }
  const urlObj = new URL(formattedUrl);
  urlObj.pathname =
    urlObj.pathname === '/finbuddy'
      ? '/finbuddy_test'
      : urlObj.pathname + '_test';
  testDbUrl = urlObj.toString();
} catch {
  testDbUrl = originalUrl + '_test';
}
process.env.DATABASE_URL = testDbUrl;

function waitForDatabase(urlStr: string, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    let hostname = 'localhost';
    let port = 5432;
    try {
      let formatted = urlStr;
      if (formatted.includes('@postgres:')) {
        formatted = formatted.replace('@postgres:', '@localhost:');
      }
      const parsed = new URL(formatted);
      hostname = parsed.hostname.replace(/^@/, '') || 'localhost';
      port = parseInt(parsed.port, 10) || 5432;
    } catch {
      // fallback
    }

    const startTime = Date.now();
    const tryConnect = () => {
      const socket = new net.Socket();
      socket.connect(port, hostname, () => {
        socket.destroy();
        resolve();
      });
      socket.on('error', (err) => {
        socket.destroy();
        if (Date.now() - startTime > timeoutMs) {
          reject(
            new Error(
              `Timeout waiting for database at ${hostname}:${port}: ${err.message}`,
            ),
          );
        } else {
          setTimeout(tryConnect, 500);
        }
      });
    };
    tryConnect();
  });
}

interface CreateTestAppOptions {
  nodeEnv?: 'development' | 'production' | 'test';
  swaggerEnabled?: boolean | string;
  corsOrigin?: string;
}

async function createTestApp(
  options: CreateTestAppOptions = {},
): Promise<INestApplication<App>> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication<App>();

  const nodeEnv = options.nodeEnv ?? process.env.NODE_ENV ?? 'development';
  const swaggerEnabled =
    options.swaggerEnabled !== undefined
      ? typeof options.swaggerEnabled === 'boolean'
        ? options.swaggerEnabled
        : options.swaggerEnabled !== 'false'
      : process.env.SWAGGER_ENABLED !== 'false';
  const corsOrigin =
    options.corsOrigin !== undefined
      ? options.corsOrigin
      : process.env.CORS_ORIGIN;

  app.use(helmet());
  app.enableShutdownHooks();
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.split(',').map((o) => o.trim())
      : nodeEnv === 'production'
        ? false
        : true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('FinBuddy API')
      .setDescription(
        'Personal finance management REST API built with NestJS, Prisma, and PostgreSQL.',
      )
      .setVersion('0.0.1')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT access token',
          in: 'header',
        },
        'JWT-auth',
      )
      .addTag('Health', 'System liveness and readiness health checks')
      .addTag('Auth', 'Authentication, token refresh, and session endpoints')
      .addTag('Users', 'User account profile endpoints')
      .addTag('Accounts', 'Financial account management endpoints')
      .addTag('Categories', 'Income and expense category management endpoints')
      .addTag('Transactions', 'Income and expense transaction endpoints')
      .addTag('Transfers', 'Account-to-account transfer endpoints')
      .addTag('Budgets', 'Monthly category budget tracking endpoints')
      .addTag('Financial Summary', 'Financial aggregated summary reports')
      .addTag(
        'Recurring Transactions',
        'Scheduled recurring transaction rules and execution endpoints',
      )
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);
  }

  await app.init();
  return app;
}

describe('Production Readiness & Operational Regression (e2e)', () => {
  let defaultApp: INestApplication<App>;

  beforeAll(async () => {
    await waitForDatabase(process.env.DATABASE_URL!);
    execSync(
      `npx prisma db push --accept-data-loss --url "${process.env.DATABASE_URL}"`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
        },
      },
    );

    defaultApp = await createTestApp({
      nodeEnv: 'production',
      swaggerEnabled: true,
      corsOrigin: 'https://app.finbuddy.com',
    });
  }, 30000);

  afterAll(async () => {
    if (defaultApp) {
      await defaultApp.close();
    }
  });

  describe('1. Environment Configuration Validation', () => {
    it('verify validate({}) throws a Config validation error naming missing required variables', () => {
      let thrownError: Error | null = null;
      try {
        validate({});
      } catch (err) {
        thrownError = err as Error;
      }

      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toContain('Config validation error');
      expect(thrownError?.message).toContain('DATABASE_URL');
      expect(thrownError?.message).toContain('JWT_SECRET');
      expect(thrownError?.message).toContain('PORT');
    });

    it('should throw Config validation error when DATABASE_URL is missing', () => {
      expect(() =>
        validate({
          JWT_SECRET: 'testsecret123',
          PORT: 3000,
        }),
      ).toThrow(/DATABASE_URL/);
    });

    it('should throw Config validation error when JWT_SECRET is missing', () => {
      expect(() =>
        validate({
          DATABASE_URL:
            'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
          PORT: 3000,
        }),
      ).toThrow(/JWT_SECRET/);
    });

    it('should throw Config validation error when PORT is missing', () => {
      expect(() =>
        validate({
          DATABASE_URL:
            'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
          JWT_SECRET: 'testsecret123',
        }),
      ).toThrow(/PORT/);
    });

    it('should throw Config validation error when NODE_ENV is not one of development, production, test', () => {
      expect(() =>
        validate({
          DATABASE_URL:
            'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
          JWT_SECRET: 'testsecret123',
          PORT: 3000,
          NODE_ENV: 'staging',
        }),
      ).toThrow(/NODE_ENV/);
    });

    it('should apply production defaults when minimal valid configuration is provided', () => {
      const config = validate({
        DATABASE_URL:
          'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
        JWT_SECRET: 'testsecret123',
        PORT: 3000,
      });

      expect(config.NODE_ENV).toBe('development');
      expect(config.SWAGGER_ENABLED).toBe(true);
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.RECURRING_TRANSACTION_AUTOMATION_ENABLED).toBe(true);
      expect(config.RECURRING_TRANSACTION_AUTOMATION_CRON).toBe('* * * * *');
      expect(config.THROTTLE_TTL).toBe(60000);
      expect(config.THROTTLE_LIMIT).toBe(100);
      expect(config.THROTTLE_AUTH_LIMIT).toBe(10);
    });

    it('should properly coerce boolean string values ("false", "0", "true", "1") for SWAGGER_ENABLED', () => {
      const configFalse = validate({
        DATABASE_URL:
          'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
        JWT_SECRET: 'testsecret123',
        PORT: 3000,
        SWAGGER_ENABLED: 'false',
      });
      expect(configFalse.SWAGGER_ENABLED).toBe(false);

      const configZero = validate({
        DATABASE_URL:
          'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
        JWT_SECRET: 'testsecret123',
        PORT: 3000,
        SWAGGER_ENABLED: '0',
      });
      expect(configZero.SWAGGER_ENABLED).toBe(false);

      const configTrue = validate({
        DATABASE_URL:
          'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
        JWT_SECRET: 'testsecret123',
        PORT: 3000,
        SWAGGER_ENABLED: 'true',
      });
      expect(configTrue.SWAGGER_ENABLED).toBe(true);
    });
  });

  describe('2. Swagger UI Conditional Mounting', () => {
    let appWithoutSwagger: INestApplication<App>;

    beforeAll(async () => {
      appWithoutSwagger = await createTestApp({ swaggerEnabled: false });
    });

    afterAll(async () => {
      if (appWithoutSwagger) {
        await appWithoutSwagger.close();
      }
    });

    it('when SWAGGER_ENABLED=true, mounts /docs returning 200 OK or 301 redirect and serves Swagger UI HTML', async () => {
      const resDocs = await request(defaultApp.getHttpServer()).get('/docs');
      expect([200, 301]).toContain(resDocs.status);

      const resDocsSlash = await request(defaultApp.getHttpServer())
        .get('/docs/')
        .expect(200);
      expect(resDocsSlash.text).toContain('swagger-ui');
      expect(resDocsSlash.headers['content-type']).toContain('text/html');
    });

    it('when SWAGGER_ENABLED=true, serves valid OpenAPI JSON specification at /docs-json', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/docs-json')
        .expect(200);

      expect(res.body).toHaveProperty('openapi');
      expect(res.body.openapi).toMatch(/^3\./);
      expect(res.body.info).toEqual({
        title: 'FinBuddy API',
        description:
          'Personal finance management REST API built with NestJS, Prisma, and PostgreSQL.',
        version: '0.0.1',
        contact: {},
      });
    });

    it('when SWAGGER_ENABLED=false, /docs returns 404 Not Found', async () => {
      const res = await request(appWithoutSwagger.getHttpServer())
        .get('/docs')
        .expect(404);

      expect(res.body).toHaveProperty('statusCode', 404);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('requestId');
    });

    it('when SWAGGER_ENABLED=false, /docs/ and /docs-json return 404 Not Found', async () => {
      await request(appWithoutSwagger.getHttpServer())
        .get('/docs/')
        .expect(404);
      await request(appWithoutSwagger.getHttpServer())
        .get('/docs-json')
        .expect(404);
    });
  });

  describe('3. CORS Origin Behavior in Production', () => {
    let prodAppNoCors: INestApplication<App>;
    let prodAppMultiCors: INestApplication<App>;

    beforeAll(async () => {
      prodAppNoCors = await createTestApp({
        nodeEnv: 'production',
        corsOrigin: undefined,
      });

      prodAppMultiCors = await createTestApp({
        nodeEnv: 'production',
        corsOrigin: 'https://app.finbuddy.com, https://admin.finbuddy.com',
      });
    });

    afterAll(async () => {
      if (prodAppNoCors) {
        await prodAppNoCors.close();
      }
      if (prodAppMultiCors) {
        await prodAppMultiCors.close();
      }
    });

    it('verify NODE_ENV=production without CORS_ORIGIN does not grant wildcard access-control-allow-origin header to arbitrary origins', async () => {
      const res = await request(prodAppNoCors.getHttpServer())
        .get('/health/live')
        .set('Origin', 'https://malicious-attacker.com')
        .expect(200);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
      expect(res.headers['access-control-allow-origin']).not.toBe(
        'https://malicious-attacker.com',
      );
    });

    it('NODE_ENV=production without CORS_ORIGIN rejects preflight OPTIONS requests without allow-origin header', async () => {
      const res = await request(prodAppNoCors.getHttpServer())
        .options('/health/live')
        .set('Origin', 'https://malicious-attacker.com')
        .set('Access-Control-Request-Method', 'GET');

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('when CORS_ORIGIN="https://app.finbuddy.com" is set, matching origin receives access-control-allow-origin: https://app.finbuddy.com', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/health/live')
        .set('Origin', 'https://app.finbuddy.com')
        .expect(200);

      expect(res.headers['access-control-allow-origin']).toBe(
        'https://app.finbuddy.com',
      );
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('when CORS_ORIGIN="https://app.finbuddy.com" is set, matching preflight OPTIONS receives access-control-allow-origin header', async () => {
      const res = await request(defaultApp.getHttpServer())
        .options('/health/live')
        .set('Origin', 'https://app.finbuddy.com')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);

      expect(res.headers['access-control-allow-origin']).toBe(
        'https://app.finbuddy.com',
      );
    });

    it('when CORS_ORIGIN="https://app.finbuddy.com" is set, non-matching arbitrary origin does not receive access-control-allow-origin header', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/health/live')
        .set('Origin', 'https://evil.com')
        .expect(200);

      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('supports trimmed comma-separated origins and authorizes each valid origin', async () => {
      const resApp = await request(prodAppMultiCors.getHttpServer())
        .get('/health/live')
        .set('Origin', 'https://app.finbuddy.com')
        .expect(200);
      expect(resApp.headers['access-control-allow-origin']).toBe(
        'https://app.finbuddy.com',
      );

      const resAdmin = await request(prodAppMultiCors.getHttpServer())
        .get('/health/live')
        .set('Origin', 'https://admin.finbuddy.com')
        .expect(200);
      expect(resAdmin.headers['access-control-allow-origin']).toBe(
        'https://admin.finbuddy.com',
      );

      const resUnknown = await request(prodAppMultiCors.getHttpServer())
        .get('/health/live')
        .set('Origin', 'https://random-origin.com')
        .expect(200);
      expect(resUnknown.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('4. Health Checks & Security Headers', () => {
    it('GET /health/live responds cleanly with 200 OK and expected JSON status', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(res.body).toEqual({ status: 'ok' });
      expect(res.body).not.toHaveProperty('database');
      expect(res.body).not.toHaveProperty('env');
    });

    it('GET /health/ready responds cleanly with 200 OK and database health status', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(res.body).toEqual({
        status: 'ok',
        info: {
          database: {
            status: 'up',
          },
        },
      });
    });

    it('verifies Helmet security headers are present on API responses', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-dns-prefetch-control']).toBe('off');
      expect(res.headers['x-download-options']).toBe('noopen');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('verifies Helmet security headers are present on error responses', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/non-existent-route-for-helmet-check')
        .expect(404);

      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('5. Secret Leakage Prevention', () => {
    const rawJwtSecret = process.env.JWT_SECRET!;
    const rawDatabaseUrl = process.env.DATABASE_URL!;
    let dbPassword = '';
    let dbUser = '';

    try {
      const parsedUrl = new URL(rawDatabaseUrl);
      dbPassword = decodeURIComponent(parsedUrl.password);
      dbUser = decodeURIComponent(parsedUrl.username);
    } catch {
      // url parsing fallback
    }

    it('health check payloads never leak database credentials, JWT_SECRET, or connection strings', async () => {
      const liveRes = await request(defaultApp.getHttpServer())
        .get('/health/live')
        .expect(200);

      const liveString = JSON.stringify(liveRes.body);
      expect(liveString).not.toContain(rawJwtSecret);
      expect(liveString).not.toContain(rawDatabaseUrl);
      if (dbPassword.length > 0) {
        expect(liveString).not.toContain(dbPassword);
      }
      expect(liveString).not.toContain('postgresql:');

      const readyRes = await request(defaultApp.getHttpServer())
        .get('/health/ready')
        .expect(200);

      const readyString = JSON.stringify(readyRes.body);
      expect(readyString).not.toContain(rawJwtSecret);
      expect(readyString).not.toContain(rawDatabaseUrl);
      if (dbPassword.length > 0) {
        expect(readyString).not.toContain(dbPassword);
      }
      expect(readyString).not.toContain('postgresql:');
    });

    it('404 Not Found error responses never leak secrets or database connection strings', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/api/secret-check/non-existent')
        .expect(404);

      const bodyString = JSON.stringify(res.body);
      expect(bodyString).not.toContain(rawJwtSecret);
      expect(bodyString).not.toContain(rawDatabaseUrl);
      if (dbPassword.length > 0) {
        expect(bodyString).not.toContain(dbPassword);
      }
      expect(bodyString).not.toContain('postgresql:');
    });

    it('400 Bad Request validation error responses never leak secrets or stack traces', async () => {
      const res = await request(defaultApp.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'invalid-email-format',
          password: 'short',
        })
        .expect(400);

      const bodyString = JSON.stringify(res.body);
      expect(bodyString).not.toContain(rawJwtSecret);
      expect(bodyString).not.toContain(rawDatabaseUrl);
      if (dbPassword.length > 0) {
        expect(bodyString).not.toContain(dbPassword);
      }
      expect(bodyString).not.toContain('node_modules');
      expect(res.body).toHaveProperty('statusCode', 400);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('requestId');
    });

    it('401 Unauthorized error responses never leak secrets', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/accounts')
        .expect(401);

      const bodyString = JSON.stringify(res.body);
      expect(bodyString).not.toContain(rawJwtSecret);
      expect(bodyString).not.toContain(rawDatabaseUrl);
      if (dbPassword.length > 0) {
        expect(bodyString).not.toContain(dbPassword);
      }
      expect(res.body).toHaveProperty('statusCode', 401);
      expect(res.body).toHaveProperty('requestId');
    });

    it('HTTP response headers never leak sensitive server banners, DB credentials, or secrets', async () => {
      const res = await request(defaultApp.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(res.headers['x-powered-by']).toBeUndefined();
      const headersString = JSON.stringify(res.headers);
      expect(headersString).not.toContain(rawJwtSecret);
      expect(headersString).not.toContain(rawDatabaseUrl);
      if (dbPassword.length > 0) {
        expect(headersString).not.toContain(dbPassword);
      }
      if (dbUser.length > 0) {
        expect(headersString).not.toContain(`user=${dbUser}`);
      }
    });
  });
});
