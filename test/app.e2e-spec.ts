import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

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

  it('GET /users/:id should return the user', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/users')
      .send({
        email: `get-${Date.now()}@finbuddy.dev`,
        password: '12345678',
      })
      .expect(201);

    const userId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .get(`/users/${userId}`)
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
    const response = await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000')
      .expect(404);

    expect(response.body).toEqual({
      statusCode: 404,
      message: 'User not found',
      error: 'Not Found',
    });
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

  afterEach(async () => {
    await app.close();
  });
});