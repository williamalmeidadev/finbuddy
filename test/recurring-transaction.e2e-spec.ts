import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
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

describe('RecurringTransactionController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;

  beforeAll(async () => {
    await waitForDatabase(process.env.DATABASE_URL!);

    execSync(
      `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="for sure" npx prisma db push --accept-data-loss --url "${process.env.DATABASE_URL}"`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'for sure',
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
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "categories", "budgets", "transactions", "transfers", "recurring_transactions" CASCADE;`,
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createTestUser(emailSuffix: string) {
    const email = `rec-e2e-${emailSuffix}-${Date.now()}@finbuddy.dev`;
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

  async function createAccount(token: string, name = 'Checking Account') {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        type: 'CHECKING',
        color: '#00FF00',
        balance: 5000,
      })
      .expect(201);
    return res.body.id as string;
  }

  async function createCategory(
    token: string,
    name: string,
    type: 'EXPENSE' | 'INCOME' = 'EXPENSE',
  ) {
    const res = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, type, color: '#FF0000' })
      .expect(201);
    return res.body as { id: string; name: string };
  }

  describe('POST /recurring-transactions', () => {
    it('should create a valid monthly expense recurring transaction', async () => {
      const user = await createTestUser('r1');
      const accountId = await createAccount(user.token);
      const category = await createCategory(user.token, 'Rent', 'EXPENSE');

      const res = await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          categoryId: category.id,
          type: 'EXPENSE',
          amount: 1500,
          description: 'Monthly Apartment Rent',
          frequency: 'MONTHLY',
          startDate: '2026-09-10',
          endDate: '2027-09-10',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.accountId).toBe(accountId);
      expect(res.body.categoryId).toBe(category.id);
      expect(res.body.type).toBe('EXPENSE');
      expect(res.body.amount).toBe(1500);
      expect(res.body.frequency).toBe('MONTHLY');
      expect(res.body.startDate).toBe('2026-09-10');
      expect(res.body.nextOccurrence).toBe('2026-09-10');
      expect(res.body.endDate).toBe('2027-09-10');
      expect(res.body.isActive).toBe(true);
    });

    it('should create an uncategorized income recurring transaction', async () => {
      const user = await createTestUser('r2');
      const accountId = await createAccount(user.token);

      const res = await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'INCOME',
          amount: 5000,
          description: 'Monthly Salary',
          frequency: 'MONTHLY',
          startDate: '2026-09-01',
        })
        .expect(201);

      expect(res.body.categoryId).toBeNull();
      expect(res.body.type).toBe('INCOME');
    });

    it('should reject category type mismatch (EXPENSE category for INCOME transaction)', async () => {
      const user = await createTestUser('r3');
      const accountId = await createAccount(user.token);
      const expenseCategory = await createCategory(
        user.token,
        'Groceries',
        'EXPENSE',
      );

      await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          categoryId: expenseCategory.id,
          type: 'INCOME',
          amount: 200,
          frequency: 'WEEKLY',
          startDate: '2026-09-10',
        })
        .expect(400);
    });

    it('should reject creation if endDate is before startDate', async () => {
      const user = await createTestUser('r4');
      const accountId = await createAccount(user.token);

      await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 100,
          frequency: 'DAILY',
          startDate: '2026-09-10',
          endDate: '2026-09-01',
        })
        .expect(400);
    });

    it('should reject creation for inactive account', async () => {
      const user = await createTestUser('r5');
      const accountId = await createAccount(user.token);

      await request(app.getHttpServer())
        .delete(`/accounts/${accountId}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 100,
          frequency: 'MONTHLY',
          startDate: '2026-09-10',
        })
        .expect(400);
    });
  });

  describe('GET /recurring-transactions', () => {
    it('should list user recurring transactions and support filters', async () => {
      const user = await createTestUser('list1');
      const accountId = await createAccount(user.token);

      await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'INCOME',
          amount: 5000,
          frequency: 'MONTHLY',
          startDate: '2026-09-01',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 50,
          frequency: 'DAILY',
          startDate: '2026-09-01',
        })
        .expect(201);

      const all = await request(app.getHttpServer())
        .get('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(all.body).toHaveLength(2);

      const expensesOnly = await request(app.getHttpServer())
        .get('/recurring-transactions?type=EXPENSE')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(expensesOnly.body).toHaveLength(1);
      expect(expensesOnly.body[0].type).toBe('EXPENSE');
    });
  });

  describe('PATCH /recurring-transactions/:id', () => {
    it('should update amount, frequency, and recalculate nextOccurrence', async () => {
      const user = await createTestUser('p1');
      const accountId = await createAccount(user.token);

      const created = await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 100,
          frequency: 'MONTHLY',
          startDate: '2026-09-10',
        })
        .expect(201);

      const updated = await request(app.getHttpServer())
        .patch(`/recurring-transactions/${created.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          amount: 150,
          frequency: 'WEEKLY',
          startDate: '2026-09-15',
        })
        .expect(200);

      expect(updated.body.amount).toBe(150);
      expect(updated.body.frequency).toBe('WEEKLY');
      expect(updated.body.startDate).toBe('2026-09-15');
      expect(updated.body.nextOccurrence).toBe('2026-09-15');
    });
  });

  describe('DELETE /recurring-transactions/:id', () => {
    it('should soft deactivate recurring transaction (isActive = false)', async () => {
      const user = await createTestUser('d1');
      const accountId = await createAccount(user.token);

      const created = await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 100,
          frequency: 'MONTHLY',
          startDate: '2026-09-10',
        })
        .expect(201);

      const deleted = await request(app.getHttpServer())
        .delete(`/recurring-transactions/${created.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(deleted.body.isActive).toBe(false);

      const fetched = await request(app.getHttpServer())
        .get(`/recurring-transactions/${created.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(fetched.body.isActive).toBe(false);
    });
  });

  describe('Security / IDOR Protection', () => {
    it('should prevent User B from accessing or mutating User A resources (404 Not Found)', async () => {
      const userA = await createTestUser('idorA');
      const userB = await createTestUser('idorB');

      const accA = await createAccount(userA.token, 'Acc A');
      const catA = await createCategory(userA.token, 'Cat A', 'EXPENSE');

      const recA = await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          accountId: accA,
          categoryId: catA.id,
          type: 'EXPENSE',
          amount: 200,
          frequency: 'MONTHLY',
          startDate: '2026-09-10',
        })
        .expect(201);

      // User B tries to create recurring transaction using User A's account => 404
      await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          accountId: accA,
          type: 'EXPENSE',
          amount: 300,
          frequency: 'MONTHLY',
          startDate: '2026-09-10',
        })
        .expect(404);

      // User B tries to create recurring transaction using User A's category => 404
      const accB = await createAccount(userB.token, 'Acc B');
      await request(app.getHttpServer())
        .post('/recurring-transactions')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          accountId: accB,
          categoryId: catA.id,
          type: 'EXPENSE',
          amount: 300,
          frequency: 'MONTHLY',
          startDate: '2026-09-10',
        })
        .expect(404);

      // User B tries to GET User A's recurring transaction => 404
      await request(app.getHttpServer())
        .get(`/recurring-transactions/${recA.body.id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(404);

      // User B tries to PATCH User A's recurring transaction => 404
      await request(app.getHttpServer())
        .patch(`/recurring-transactions/${recA.body.id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ amount: 999 })
        .expect(404);

      // User B tries to DELETE User A's recurring transaction => 404
      await request(app.getHttpServer())
        .delete(`/recurring-transactions/${recA.body.id}`)
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(404);
    });
  });
});
