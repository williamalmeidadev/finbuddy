import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { execSync } from 'child_process';
import net from 'net';

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

describe('OpenAPI / Swagger Documentation (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    await waitForDatabase(process.env.DATABASE_URL!);
    execSync(
      `DATABASE_URL="${process.env.DATABASE_URL}" npx prisma db push --accept-data-loss --schema=prisma/schema.prisma`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
        },
      },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

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

    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Swagger UI Endpoint Accessibility', () => {
    it('GET /docs should return 200 OK with HTML Swagger UI page', async () => {
      const res = await request(app.getHttpServer()).get('/docs/').expect(200);

      expect(res.text).toContain('swagger-ui');
      expect(res.headers['content-type']).toContain('text/html');
    });

    it('GET /docs-json should return 200 OK with valid OpenAPI 3.0 specification JSON', async () => {
      const res = await request(app.getHttpServer())
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
  });

  describe('2. OpenAPI Schema Metadata & Security', () => {
    it('should configure JWT bearer authentication scheme under components.securitySchemes', async () => {
      const res = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);

      const securitySchemes = res.body.components?.securitySchemes;
      expect(securitySchemes).toBeDefined();
      expect(securitySchemes['JWT-auth']).toEqual({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT access token',
        in: 'header',
      });
    });

    it('should include all required module tags', async () => {
      const res = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);

      const tagNames = res.body.tags.map((t: { name: string }) => t.name);
      expect(tagNames).toContain('Health');
      expect(tagNames).toContain('Auth');
      expect(tagNames).toContain('Users');
      expect(tagNames).toContain('Accounts');
      expect(tagNames).toContain('Categories');
      expect(tagNames).toContain('Transactions');
      expect(tagNames).toContain('Transfers');
      expect(tagNames).toContain('Budgets');
      expect(tagNames).toContain('Financial Summary');
      expect(tagNames).toContain('Recurring Transactions');
    });

    it('should document all existing API endpoint paths', async () => {
      const res = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);

      const paths = Object.keys(res.body.paths);

      // Auth & Users
      expect(paths).toContain('/auth/login');
      expect(paths).toContain('/auth/refresh');
      expect(paths).toContain('/auth/logout');
      expect(paths).toContain('/auth/me');
      expect(paths).toContain('/users');
      expect(paths).toContain('/users/{id}');

      // Financial Domain
      expect(paths).toContain('/accounts');
      expect(paths).toContain('/accounts/{id}');
      expect(paths).toContain('/categories');
      expect(paths).toContain('/categories/{id}');
      expect(paths).toContain('/transactions');
      expect(paths).toContain('/transactions/{id}');
      expect(paths).toContain('/transfers');
      expect(paths).toContain('/transfers/{id}');
      expect(paths).toContain('/budgets');
      expect(paths).toContain('/budgets/{id}');
      expect(paths).toContain('/financial-summary');
      expect(paths).toContain('/recurring-transactions');
      expect(paths).toContain('/recurring-transactions/execute');
      expect(paths).toContain('/recurring-transactions/{id}');

      expect(paths).toContain('/health/live');
      expect(paths).toContain('/health/ready');
    });

    it('should enforce security metadata on protected endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);

      const accountsPost = res.body.paths['/accounts']?.post;
      expect(accountsPost).toBeDefined();
      expect(accountsPost.security).toEqual([{ 'JWT-auth': [] }]);

      const authLoginPost = res.body.paths['/auth/login']?.post;
      expect(authLoginPost).toBeDefined();
      expect(authLoginPost.security).toBeUndefined();
    });

    it('should represent enum schemas with valid enum values on DTO properties', async () => {
      const res = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);

      const schemas = res.body.components?.schemas;
      expect(schemas).toBeDefined();

      expect(schemas.AccountResponseDto.properties.type.enum).toEqual([
        'CHECKING',
        'SAVINGS',
        'CREDIT_CARD',
        'INVESTMENT',
        'CASH',
      ]);
      expect(schemas.TransactionResponseDto.properties.type.enum).toEqual([
        'INCOME',
        'EXPENSE',
      ]);
      expect(schemas.CategoryResponseDto.properties.type.enum).toEqual([
        'INCOME',
        'EXPENSE',
      ]);
      expect(
        schemas.RecurringTransactionResponseDto.properties.frequency.enum,
      ).toEqual(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
    });

    it('should never expose sensitive secrets in the OpenAPI JSON document', async () => {
      const res = await request(app.getHttpServer())
        .get('/docs-json')
        .expect(200);

      const specString = JSON.stringify(res.body);
      expect(specString).not.toContain(process.env.JWT_SECRET);
      expect(specString).not.toContain(process.env.DATABASE_URL);
      expect(specString).not.toContain('postgres');
    });
  });
});
