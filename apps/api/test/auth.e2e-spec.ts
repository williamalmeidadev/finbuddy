import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DatabaseService } from '../src/database/database.service';
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

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    // Wait for the database server to be reachable
    await waitForDatabase(process.env.DATABASE_URL!);

    // Push the schema to the test database explicitly passing --url
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
  }, 30000);

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.use(cookieParser());

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
    it('should refresh the tokens using HttpOnly cookie', async () => {
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

      const cookies = loginResponse.get('Set-Cookie');
      expect(cookies).toBeDefined();
      expect(cookies![0]).toContain('finbuddy_rt=');

      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies!)
        .expect(200);

      expect(refreshResponse.body).toEqual({
        accessToken: expect.any(String),
        user: expect.objectContaining({
          email,
        }),
      });

      expect(refreshResponse.get('Set-Cookie')).toBeDefined();
      expect(refreshResponse.body.accessToken).not.toBe(
        loginResponse.body.accessToken,
      );
    });

    it('should reject an invalid refresh token cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', ['finbuddy_rt=invalid-refresh-token'])
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

      const firstCookies = loginResponse.get('Set-Cookie');

      const firstRefreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', firstCookies!)
        .expect(200);

      // Re-using the first refresh token cookie after rotation should fail with 401
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', firstCookies!)
        .expect(401);
    });

    it('should reject a missing refresh token cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
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
    it('should revoke the refresh token cookie', async () => {
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

      const cookies = loginResponse.get('Set-Cookie');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', cookies!)
        .expect(200);

      // Verify that refreshing with the logged out token cookie now fails
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', cookies!)
        .expect(401);
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
