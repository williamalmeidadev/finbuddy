import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { execSync } from 'child_process';

// Override DATABASE_URL to use the test database
const originalUrl = process.env.DATABASE_URL || 'postgresql://finbuddy:senhaDB232@@postgres:5432/finbuddy';
const testDbUrl = originalUrl.includes('/finbuddy') 
  ? originalUrl.replace('/finbuddy', '/finbuddy_test')
  : originalUrl + '_test';
process.env.DATABASE_URL = testDbUrl;

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(() => {
    // Push the schema to the test database
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
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
    const prisma = app.get(PrismaService);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens" CASCADE;`);
  });

  it('POST /users should create a user', async () => {
    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: `e2e-${Date.now()}@finbuddy.dev`,
        password: '12345678',
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        email: expect.stringMatching(/^e2e-\d+@finbuddy\.dev$/),
        status: 'ACTIVE',
        emailVerifiedAt: null,
        lastLoginAt: null,
      }),
    );

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('createdAt');
    expect(response.body).toHaveProperty('updatedAt');
    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('POST /users should reject an invalid email', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'invalid-email',
        password: '12345678',
      })
      .expect(400);
  });

  it('POST /users should reject a short password', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: `e2e-${Date.now()}@finbuddy.dev`,
        password: '1234567',
      })
      .expect(400);
  });

  it('POST /users should reject non-whitelisted fields', async () => {
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: `e2e-${Date.now()}@finbuddy.dev`,
        password: '12345678',
        role: 'ADMIN',
      })
      .expect(400);
  });

  it('POST /users should reject a duplicate email', async () => {
    const email = `e2e-duplicate-${Date.now()}@finbuddy.dev`;

    await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password: '12345678',
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password: '12345678',
      })
      .expect(409);

    expect(response.body).toEqual({
      statusCode: 409,
      message: 'Email already exists',
      error: 'Conflict',
    });
  });

  it('POST /users should normalize email and reject duplicates', async () => {
    const email = `  Test-${Date.now()}@FinBuddy.Dev  `;
    const normalizedEmail = email.trim().toLowerCase();

    const firstResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password: '12345678',
      })
      .expect(201);

    expect(firstResponse.body.email).toBe(normalizedEmail);

    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: ` ${normalizedEmail.toUpperCase()} `,
        password: '12345678',
      })
      .expect(409);
  });

  it('GET /users/:id should return 401 without a token', async () => {
    await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000')
      .expect(401);
  });

  it('GET /users/:id should return 401 with an invalid token', async () => {
    await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('GET /users/:id should return the user', async () => {
    const email = `get-${Date.now()}@finbuddy.dev`;
    const password = '12345678';

    const createResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email,
        password,
      })
      .expect(201);

    const userId = createResponse.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email,
        password,
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken;

    const response = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: userId,
        email: createResponse.body.email,
        status: 'ACTIVE',
        emailVerifiedAt: null,
        lastLoginAt: null,
      }),
    );

    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('GET /users/:id should return 404 when user does not exist', async () => {
    const email = `get-not-found-${Date.now()}@finbuddy.dev`;
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
      .get('/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      message: 'User not found',
      error: 'Not Found',
    });
  });

  it('GET /users/:id should return 403 when user is different from authenticated user (IDOR prevention)', async () => {
    const email1 = `idor1-${Date.now()}@finbuddy.dev`;
    const password = '12345678';

    const createResponse1 = await request(app.getHttpServer())
      .post('/users')
      .send({ email: email1, password })
      .expect(201);
    const user1Id = createResponse1.body.id;

    const email2 = `idor2-${Date.now()}@finbuddy.dev`;
    const createResponse2 = await request(app.getHttpServer())
      .post('/users')
      .send({ email: email2, password })
      .expect(201);
    const user2Id = createResponse2.body.id;

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: email1, password })
      .expect(201);
    const accessToken1 = loginResponse.body.accessToken;

    await request(app.getHttpServer())
      .get(`/users/${user2Id}`)
      .set('Authorization', `Bearer ${accessToken1}`)
      .expect(403);
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
          lastLoginAt: null,
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

      const oldRefreshToken =
        loginResponse.body.refreshToken;

      expect(oldRefreshToken).toEqual(expect.any(String));

      const refreshResponse =
        await request(app.getHttpServer())
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

      expect(
        refreshResponse.body.refreshToken,
      ).not.toBe(oldRefreshToken);

      expect(
        refreshResponse.body.accessToken,
      ).not.toBe(loginResponse.body.accessToken);
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

      const refreshToken =
        loginResponse.body.refreshToken;

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
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
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

      const prisma = app.get(PrismaService);
      await prisma.user.delete({
        where: { email },
      });

      await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
