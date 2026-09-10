import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { execSync } from 'child_process';
import net from 'net';

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'NdOQ65X2opk54iL5AR1wg00LMTdivXxJfexziGVg3Ow=';

const originalUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/finbuddy';
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

describe('UserController (e2e)', () => {
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
        lastLoginAt: expect.any(String),
      }),
    );

    expect(response.body).not.toHaveProperty('passwordHash');
  });

  it('GET /users/:id should return 404 when user does not exist', async () => {
    const email = `get-not-found-${Date.now()}@finbuddy.dev`;
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

    // Delete user from DB so they don't exist anymore
    const prisma = app.get(DatabaseService);
    await prisma.user.delete({
      where: { id: userId },
    });

    const response = await request(app.getHttpServer())
      .get(`/users/${userId}`)
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

    await request(app.getHttpServer())
      .post('/users')
      .send({ email: email1, password })
      .expect(201);

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

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
