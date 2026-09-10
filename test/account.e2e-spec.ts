import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { execSync } from 'child_process';
import net from 'net';

process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'NdOQ65X2opk54iL5AR1wg00LMTdivXxJfexziGVg3Ow=';

const originalUrl =
  process.env.DATABASE_URL ||
  'postgresql://finbuddy:senhaDB232@localhost:5432/finbuddy';
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

describe('AccountController (e2e)', () => {
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

    const prisma = app.get(DatabaseService);
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts" CASCADE;`,
    );
  });

  async function createTestUser(emailSuffix: string) {
    const email = `account-e2e-${emailSuffix}-${Date.now()}@finbuddy.dev`;
    const password = '12345678';

    const createRes = await request(app.getHttpServer())
      .post('/users')
      .send({ email, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return {
      userId: createRes.body.id,
      email,
      token: loginRes.body.accessToken as string,
    };
  }

  describe('POST /accounts', () => {
    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/accounts')
        .send({
          name: 'Main Checking',
          type: 'CHECKING',
          color: '#820AD1',
        })
        .expect(401);
    });

    it('should create an account with valid input', async () => {
      const user = await createTestUser('create-valid');

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Nubank Checking',
          type: 'CHECKING',
          color: '#820AD1',
          balance: 1250.5,
          currency: 'BRL',
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          userId: user.userId,
          name: 'Nubank Checking',
          type: 'CHECKING',
          color: '#820AD1',
          balance: 1250.5,
          currency: 'BRL',
          isActive: true,
        }),
      );
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');
    });

    it('should apply defaults for balance, currency, and isActive', async () => {
      const user = await createTestUser('create-defaults');

      const response = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Emergency Savings',
          type: 'SAVINGS',
          color: '#00FF00',
        })
        .expect(201);

      expect(response.body.balance).toBe(0);
      expect(response.body.currency).toBe('BRL');
      expect(response.body.isActive).toBe(true);
    });

    it('should reject invalid HEX color', async () => {
      const user = await createTestUser('invalid-color');

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Invalid Color Account',
          type: 'CHECKING',
          color: 'red',
        })
        .expect(400);
    });

    it('should reject invalid AccountType', async () => {
      const user = await createTestUser('invalid-type');

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Bad Type',
          type: 'CRYPTO',
          color: '#123456',
        })
        .expect(400);
    });

    it('should reject invalid currency code', async () => {
      const user = await createTestUser('invalid-currency');

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Bad Currency',
          type: 'CHECKING',
          color: '#123456',
          currency: 'INVALID',
        })
        .expect(400);
    });

    it('should reject empty name', async () => {
      const user = await createTestUser('empty-name');

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: '   ',
          type: 'CHECKING',
          color: '#123456',
        })
        .expect(400);
    });
  });

  describe('GET /accounts', () => {
    it('should return accounts belonging only to the authenticated user', async () => {
      const userA = await createTestUser('list-a');
      const userB = await createTestUser('list-b');

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ name: "User A's Account", type: 'CHECKING', color: '#111111' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ name: "User B's Account", type: 'SAVINGS', color: '#222222' })
        .expect(201);

      const responseA = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(responseA.body).toHaveLength(1);
      expect(responseA.body[0].name).toBe("User A's Account");

      const responseB = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      expect(responseB.body).toHaveLength(1);
      expect(responseB.body[0].name).toBe("User B's Account");
    });
  });

  describe('GET /accounts/:id', () => {
    it('should reject invalid UUID param', async () => {
      const user = await createTestUser('invalid-uuid');

      await request(app.getHttpServer())
        .get('/accounts/not-a-valid-uuid')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(400);
    });

    it('should return account details for owner', async () => {
      const user = await createTestUser('get-owner');

      const createRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Investment Account',
          type: 'INVESTMENT',
          color: '#333333',
        })
        .expect(201);

      const accountId = createRes.body.id;

      const getRes = await request(app.getHttpServer())
        .get(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(getRes.body.id).toBe(accountId);
      expect(getRes.body.name).toBe('Investment Account');
    });

    it('should return 404 for non-existent account', async () => {
      const user = await createTestUser('get-404');

      await request(app.getHttpServer())
        .get('/accounts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(404);
    });

    it('should return 404 when User A requests User B account (IDOR prevention)', async () => {
      const userA = await createTestUser('idor-get-a');
      const userB = await createTestUser('idor-get-b');

      const createRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          name: "User B's Private Account",
          type: 'CASH',
          color: '#444444',
        })
        .expect(201);

      const accountBId = createRes.body.id;

      // User A attempts to access User B's account -> 404 (no account enumeration)
      await request(app.getHttpServer())
        .get(`/accounts/${accountBId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(404);
    });
  });

  describe('PATCH /accounts/:id', () => {
    it('should update account allowed metadata for owner', async () => {
      const user = await createTestUser('patch-owner');

      const createRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Old Account Name', type: 'CHECKING', color: '#111111' })
        .expect(201);

      const accountId = createRes.body.id;

      const updateRes = await request(app.getHttpServer())
        .patch(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Renamed Account',
          type: 'SAVINGS',
          currency: 'USD',
          color: '#ABCDEF',
          isActive: false,
        })
        .expect(200);

      expect(updateRes.body.name).toBe('Renamed Account');
      expect(updateRes.body.type).toBe('SAVINGS');
      expect(updateRes.body.currency).toBe('USD');
      expect(updateRes.body.color).toBe('#ABCDEF');
      expect(updateRes.body.isActive).toBe(false);
    });

    it('should reject direct balance update via PATCH', async () => {
      const user = await createTestUser('patch-balance');

      const createRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Account Balance Test',
          type: 'CHECKING',
          color: '#111111',
          balance: 500,
        })
        .expect(201);

      const accountId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ balance: 9999 })
        .expect(400);
    });

    it('should return 404 when User A tries to update User B account', async () => {
      const userA = await createTestUser('patch-idor-a');
      const userB = await createTestUser('patch-idor-b');

      const createRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ name: "User B's Account", type: 'CHECKING', color: '#111111' })
        .expect(201);

      const accountBId = createRes.body.id;

      await request(app.getHttpServer())
        .patch(`/accounts/${accountBId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });
  });

  describe('DELETE /accounts/:id', () => {
    it('should soft-deactivate account for owner', async () => {
      const user = await createTestUser('delete-owner');

      const createRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'To Deactivate', type: 'CHECKING', color: '#111111' })
        .expect(201);

      const accountId = createRes.body.id;

      const deactivateRes = await request(app.getHttpServer())
        .delete(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(deactivateRes.body.isActive).toBe(false);
    });

    it('should return 404 when User A tries to deactivate User B account', async () => {
      const userA = await createTestUser('delete-idor-a');
      const userB = await createTestUser('delete-idor-b');

      const createRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ name: "User B's Account", type: 'CHECKING', color: '#111111' })
        .expect(201);

      const accountBId = createRes.body.id;

      await request(app.getHttpServer())
        .delete(`/accounts/${accountBId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(404);
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
