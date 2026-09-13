import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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

describe('Rate Limiting & Abuse Protection (e2e)', () => {
  let app: INestApplication<App>;

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
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Health Probe Rate Limit Exclusion (@SkipThrottle)', () => {
    it('GET /health/live and GET /health/ready should not be rate limited even when called repeatedly', async () => {
      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .get('/health/live')
          .expect(200);
        expect(res.body).toEqual({ status: 'ok' });
      }

      for (let i = 0; i < 15; i++) {
        const res = await request(app.getHttpServer())
          .get('/health/ready')
          .expect(200);
        expect(res.body).toHaveProperty('status', 'ok');
      }
    });
  });

  describe('2. Auth Endpoint Throttling (@Throttle auth)', () => {
    it('POST /auth/login should throttle after limit is exceeded and return 429 shape with request correlation', async () => {
      const testEmail = `ratelimit-auth-${Date.now()}@example.com`;

      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ email: testEmail, password: 'WrongPassword123!' });
      }

      const customReqId = 'rate-limit-test-correlation-id';
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .set('X-Request-Id', customReqId)
        .send({ email: testEmail, password: 'WrongPassword123!' })
        .expect(429);

      expect(res.body).toHaveProperty('statusCode', 429);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('requestId', customReqId);
      expect(res.headers).toHaveProperty('x-request-id', customReqId);
    });

    it('POST /auth/refresh should also be subject to strict auth throttling', async () => {
      const dummyToken = 'a'.repeat(64);

      for (let i = 0; i < 10; i++) {
        await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: dummyToken });
      }

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: dummyToken })
        .expect(429);

      expect(res.body).toHaveProperty('statusCode', 429);
    });
  });
});
