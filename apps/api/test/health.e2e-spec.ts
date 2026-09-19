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

describe('Health Checks & Observability (e2e)', () => {
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
    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Health Check Endpoints', () => {
    it('GET /health/live should return 200 OK with status ok without auth', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(res.body).toEqual({ status: 'ok' });
      expect(res.body).not.toHaveProperty('database');
      expect(res.body).not.toHaveProperty('env');
    });

    it('GET /health/ready should return 200 OK with database status when DB is healthy', async () => {
      const res = await request(app.getHttpServer())
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
      expect(JSON.stringify(res.body)).not.toContain('DATABASE_URL');
      expect(JSON.stringify(res.body)).not.toContain('postgres');
    });
  });

  describe('2. Request Correlation (X-Request-Id)', () => {
    it('should generate and return X-Request-Id header when missing from request', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/live')
        .expect(200);

      expect(res.headers).toHaveProperty('x-request-id');
      expect(typeof res.headers['x-request-id']).toBe('string');
      expect(res.headers['x-request-id'].length).toBeGreaterThan(0);
    });

    it('should preserve and return valid custom X-Request-Id header', async () => {
      const customId = 'custom-request-id-12345';
      const res = await request(app.getHttpServer())
        .get('/health/live')
        .set('X-Request-Id', customId)
        .expect(200);

      expect(res.headers['x-request-id']).toBe(customId);
    });

    it('should safely replace malformed or oversized X-Request-Id header', async () => {
      const malformedId = 'a'.repeat(200) + '<script>bad</script>';
      const res = await request(app.getHttpServer())
        .get('/health/live')
        .set('X-Request-Id', malformedId)
        .expect(200);

      expect(res.headers['x-request-id']).not.toBe(malformedId);
      expect(res.headers['x-request-id'].length).toBeLessThan(100);
    });
  });

  describe('3. Global Exception Handling & Error Shape', () => {
    it('should include X-Request-Id in error response JSON', async () => {
      const customId = 'error-test-req-id';
      const res = await request(app.getHttpServer())
        .get('/non-existent-route-404')
        .set('X-Request-Id', customId)
        .expect(404);

      expect(res.body).toHaveProperty('requestId', customId);
      expect(res.body).toHaveProperty('statusCode', 404);
    });
  });
});
