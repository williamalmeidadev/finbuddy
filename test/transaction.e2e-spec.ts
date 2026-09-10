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
  'postgresql://finbuddy:senhaDB232%40@localhost:5432/finbuddy';
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

describe('TransactionController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;

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

    prisma = app.get(DatabaseService);
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "transactions" CASCADE;`,
    );
  });

  async function createTestUser(emailSuffix: string) {
    const email = `tx-e2e-${emailSuffix}-${Date.now()}@finbuddy.dev`;
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

  async function createTestAccount(token: string, initialBalance = 1000) {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Checking Account',
        type: 'CHECKING',
        color: '#123456',
        balance: initialBalance,
      })
      .expect(201);

    return res.body as { id: string; balance: number; isActive: boolean };
  }

  describe('POST /transactions', () => {
    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .send({
          accountId: '00000000-0000-0000-0000-000000000000',
          type: 'INCOME',
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(401);
    });

    it('should create INCOME transaction and atomically increase account balance', async () => {
      const user = await createTestUser('tx-income');
      const account = await createTestAccount(user.token, 1000);

      const response = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: account.id,
          type: 'INCOME',
          amount: 250.5,
          description: 'Freelance payment',
          source: 'MANUAL',
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          accountId: account.id,
          type: 'INCOME',
          amount: 250.5,
          description: 'Freelance payment',
          source: 'MANUAL',
        }),
      );

      // Verify account balance was atomically updated in DB
      const updatedAcc = await request(app.getHttpServer())
        .get(`/accounts/${account.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(updatedAcc.body.balance).toBe(1250.5);
    });

    it('should create EXPENSE transaction and atomically decrease account balance', async () => {
      const user = await createTestUser('tx-expense');
      const account = await createTestAccount(user.token, 1000);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: account.id,
          type: 'EXPENSE',
          amount: 300,
          description: 'Groceries',
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      const updatedAcc = await request(app.getHttpServer())
        .get(`/accounts/${account.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(updatedAcc.body.balance).toBe(700);
    });

    it('should reject creating transaction on an inactive account', async () => {
      const user = await createTestUser('tx-inactive');
      const account = await createTestAccount(user.token, 500);

      // Deactivate account
      await request(app.getHttpServer())
        .delete(`/accounts/${account.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: account.id,
          type: 'INCOME',
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should return 404 when user tries to create transaction on another user account', async () => {
      const userA = await createTestUser('tx-idor-a');
      const userB = await createTestUser('tx-idor-b');
      const accountB = await createTestAccount(userB.token, 500);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          accountId: accountB.id,
          type: 'INCOME',
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(404);
    });

    it('should reject negative or zero amount', async () => {
      const user = await createTestUser('tx-invalid-amount');
      const account = await createTestAccount(user.token, 1000);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: account.id,
          type: 'INCOME',
          amount: -50,
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should reject unwhitelisted properties', async () => {
      const user = await createTestUser('tx-extra-prop');
      const account = await createTestAccount(user.token, 1000);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: account.id,
          type: 'INCOME',
          amount: 50,
          transactionAt: new Date().toISOString(),
          hackedProp: 'malicious',
        })
        .expect(400);
    });
  });

  describe('GET /transactions', () => {
    it('should return only transactions belonging to the authenticated user', async () => {
      const userA = await createTestUser('list-tx-a');
      const userB = await createTestUser('list-tx-b');

      const accountA = await createTestAccount(userA.token);
      const accountB = await createTestAccount(userB.token);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          accountId: accountA.id,
          type: 'INCOME',
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          accountId: accountB.id,
          type: 'EXPENSE',
          amount: 50,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      const listA = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(listA.body).toHaveLength(1);
      expect(listA.body[0].accountId).toBe(accountA.id);
    });
  });

  describe('GET /transactions/:id', () => {
    it('should return 400 for malformed UUID', async () => {
      const user = await createTestUser('tx-uuid');

      await request(app.getHttpServer())
        .get('/transactions/not-a-valid-uuid')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(400);
    });

    it('should return 404 when User A requests User B transaction (IDOR prevention)', async () => {
      const userA = await createTestUser('tx-get-idor-a');
      const userB = await createTestUser('tx-get-idor-b');

      const accountB = await createTestAccount(userB.token);

      const txRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          accountId: accountB.id,
          type: 'INCOME',
          amount: 500,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      const txBId = txRes.body.id;

      await request(app.getHttpServer())
        .get(`/transactions/${txBId}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(404);
    });
  });

  describe('PATCH /transactions/:id', () => {
    it('should update transaction and adjust account balance accordingly', async () => {
      const user = await createTestUser('tx-patch');
      const account = await createTestAccount(user.token, 1000);

      const txRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: account.id,
          type: 'INCOME',
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      const txId = txRes.body.id;

      // Balance is now 1100. Now update transaction from INCOME 100 to EXPENSE 50.
      await request(app.getHttpServer())
        .patch(`/transactions/${txId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          type: 'EXPENSE',
          amount: 50,
        })
        .expect(200);

      // Original impact: +100. New impact: -50. Delta = -150. New balance = 1000 - 50 = 950.
      const updatedAcc = await request(app.getHttpServer())
        .get(`/accounts/${account.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(updatedAcc.body.balance).toBe(950);
    });

    it('should return 404 when User A tries to update User B transaction', async () => {
      const userA = await createTestUser('tx-patch-idor-a');
      const userB = await createTestUser('tx-patch-idor-b');

      const accountB = await createTestAccount(userB.token);

      const txRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          accountId: accountB.id,
          type: 'INCOME',
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      await request(app.getHttpServer())
        .patch(`/transactions/${txRes.body.id}`)
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ amount: 9999 })
        .expect(404);
    });
  });

  describe('DELETE /transactions/:id', () => {
    it('should delete transaction and reverse balance impact', async () => {
      const user = await createTestUser('tx-delete');
      const account = await createTestAccount(user.token, 1000);

      const txRes = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: account.id,
          type: 'INCOME',
          amount: 200,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      // Balance is now 1200. Delete the transaction.
      await request(app.getHttpServer())
        .delete(`/transactions/${txRes.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      // Balance should be reverted back to 1000.
      const updatedAcc = await request(app.getHttpServer())
        .get(`/accounts/${account.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(updatedAcc.body.balance).toBe(1000);
    });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
