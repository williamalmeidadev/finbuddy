import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { execSync } from 'child_process';
import net from 'net';

const originalUrl = process.env.DATABASE_URL;
if (!originalUrl) {
  throw new Error('DATABASE_URL environment variable must be defined for E2E tests');
}
let testDbUrl: string;
try {
  const urlObj = new URL(originalUrl);
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
    let hostname = 'postgres';
    let port = 5432;
    try {
      const parsed = new URL(urlStr);
      hostname = parsed.hostname;
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

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Wait for the database server to be reachable
    await waitForDatabase(process.env.DATABASE_URL!);

    // Push the schema to the test database explicitly passing --url
    execSync(
      `npx prisma db push --accept-data-loss --url "${process.env.DATABASE_URL}"`,
      { stdio: 'inherit' },
    );
  });

  beforeEach(async () => {
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

    // Clean up database tables for isolation
    const prisma = app.get(DatabaseService);
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens" CASCADE;`,
    );
  });

  it('POST /auth/login should authenticate a user', async () => {
    const email = `login-${Date.now()}@finbuddy.dev`;
    const password = '12345678';

    await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        accessToken: expect.any(String),
        user: expect.objectContaining({
          id: expect.any(String),
          email,
          status: 'ACTIVE',
          emailVerifiedAt: null,
          lastLoginAt: expect.any(String),
        }),
      }),
    );

    expect(response.body.user).not.toHaveProperty('passwordHash');
  });

  describe('POST /auth/refresh', () => {
    it('should refresh the tokens', async () => {
      const email = `refresh-${Date.now()}@finbuddy.dev`;
      const password = '12345678';

      await request(app.getHttpServer())
        .post('/users')
        .send({
          email,
          password,
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(201);

      const oldRefreshToken = loginResponse.body.refreshToken;

      expect(oldRefreshToken).toEqual(expect.any(String));

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: oldRefreshToken,
        })
        .expect(200);

      expect(refreshResponse.body).toEqual({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
        user: expect.objectContaining({
          email,
        }),
      });

      expect(refreshResponse.body.refreshToken).not.toBe(oldRefreshToken);

      expect(refreshResponse.body.accessToken).not.toBe(
        loginResponse.body.accessToken,
      );
    });

    it('should reject an invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token',
        })
        .expect(401);
    });

    it('should reject a revoked refresh token', async () => {
      const email = `revoked-${Date.now()}@finbuddy.dev`;
      const password = '12345678';

      await request(app.getHttpServer())
        .post('/users')
        .send({
          email,
          password,
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(201);

      const refreshToken = loginResponse.body.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401);
    });

    it('should reject a missing refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(400);
    });
  });

  describe('GET /auth/me', () => {
    it('should return the authenticated user', async () => {
      const email = `me-${Date.now()}@finbuddy.dev`;
      const password = '12345678';

      await request(app.getHttpServer())
        .post('/users')
        .send({
          email,
          password,
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(201);

      const accessToken = loginResponse.body.accessToken;

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          email,
          status: 'ACTIVE',
        }),
      );

      expect(response.body).toHaveProperty('id');
      expect(response.body).not.toHaveProperty('passwordHash');
    });

    it('should reject without a token', async () => {
      await request(app.getHttpServer()).get('/auth/me').expect(401);
    });

    it('should reject with an invalid token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should reject when the user no longer exists', async () => {
      const email = `me-deleted-${Date.now()}@finbuddy.dev`;
      const password = '12345678';

      await request(app.getHttpServer())
        .post('/users')
        .send({
          email,
          password,
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(201);

      const accessToken = loginResponse.body.accessToken;

      const prisma = app.get(DatabaseService);
      await prisma.user.delete({
        where: { email },
      });

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  describe('POST /auth/logout', () => {
    it('should revoke the refresh token', async () => {
      const email = `logout-${Date.now()}@finbuddy.dev`;
      const password = '12345678';

      await request(app.getHttpServer())
        .post('/users')
        .send({
          email,
          password,
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email,
          password,
        })
        .expect(201);

      const refreshToken = loginResponse.body.refreshToken;

      await request(app.getHttpServer())
        .post('/auth/logout')
        .send({
          refreshToken,
        })
        .expect(200);

      // Verify that refreshing with the logged out token now fails
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401);
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
