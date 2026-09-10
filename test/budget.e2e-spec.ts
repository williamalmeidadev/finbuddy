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

describe('BudgetController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;

  beforeAll(async () => {
    await waitForDatabase(process.env.DATABASE_URL!);

    execSync(
      `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="for sure! proceed" npx prisma db push --accept-data-loss --url "${process.env.DATABASE_URL}"`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'for sure! proceed',
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
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "categories", "budgets", "transactions", "transfers" CASCADE;`,
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createTestUser(emailSuffix: string) {
    const email = `bgt-e2e-${emailSuffix}-${Date.now()}@finbuddy.dev`;
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

  async function createTestAccount(token: string) {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Checking Account',
        type: 'CHECKING',
        color: '#00FF00',
        balance: 2000,
      })
      .expect(201);
    return res.body.id as string;
  }

  async function createTestCategory(
    token: string,
    name: string,
    type: 'EXPENSE' | 'INCOME' = 'EXPENSE',
  ) {
    const res = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        type,
        color: '#FF0000',
      })
      .expect(201);
    return res.body as { id: string; name: string; type: string };
  }

  describe('POST /budgets', () => {
    it('should create a budget for an active expense category', async () => {
      const user = await createTestUser('c1');
      const category = await createTestCategory(user.token, 'Groceries');

      const res = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          categoryId: category.id,
          amount: 800,
          month: '2026-09',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.categoryId).toBe(category.id);
      expect(res.body.amount).toBe(800);
      expect(res.body.spent).toBe(0);
      expect(res.body.remaining).toBe(800);
      expect(res.body.percentageUsed).toBe(0);
      expect(res.body.month).toMatch(/^2026-09-01/);
    });

    it('should reject creating budget for an INCOME category', async () => {
      const user = await createTestUser('c2');
      const category = await createTestCategory(user.token, 'Salary', 'INCOME');

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          categoryId: category.id,
          amount: 1000,
          month: '2026-09',
        })
        .expect(400);
    });

    it('should reject creating budget for an inactive category', async () => {
      const user = await createTestUser('c3');
      const category = await createTestCategory(
        user.token,
        'Old Subscriptions',
      );

      await request(app.getHttpServer())
        .delete(`/categories/${category.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          categoryId: category.id,
          amount: 200,
          month: '2026-09',
        })
        .expect(400);
    });

    it('should reject creating budget for another user category (404 Not Found)', async () => {
      const user1 = await createTestUser('c4a');
      const user2 = await createTestUser('c4b');
      const category1 = await createTestCategory(user1.token, 'User 1 Food');

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user2.token}`)
        .send({
          categoryId: category1.id,
          amount: 500,
          month: '2026-09',
        })
        .expect(404);
    });

    it('should reject duplicate budget for same category and month (409 Conflict)', async () => {
      const user = await createTestUser('c5');
      const category = await createTestCategory(user.token, 'Utilities');

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          categoryId: category.id,
          amount: 300,
          month: '2026-09',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          categoryId: category.id,
          amount: 400,
          month: '2026-09',
        })
        .expect(409);
    });

    it('should reject non-positive amounts', async () => {
      const user = await createTestUser('c6');
      const category = await createTestCategory(user.token, 'Transport');

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          categoryId: category.id,
          amount: -50,
          month: '2026-09',
        })
        .expect(400);
    });
  });

  describe('GET /budgets', () => {
    it('should list user budgets and support categoryId and month filters', async () => {
      const user = await createTestUser('l1');
      const cat1 = await createTestCategory(user.token, 'Food');
      const cat2 = await createTestCategory(user.token, 'Health');

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ categoryId: cat1.id, amount: 500, month: '2026-09' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ categoryId: cat2.id, amount: 300, month: '2026-09' })
        .expect(201);

      const allRes = await request(app.getHttpServer())
        .get('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(allRes.body).toHaveLength(2);

      const filteredRes = await request(app.getHttpServer())
        .get(`/budgets?categoryId=${cat1.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(filteredRes.body).toHaveLength(1);
      expect(filteredRes.body[0].categoryId).toBe(cat1.id);
    });
  });

  describe('GET /budgets/:id', () => {
    it('should return budget details with spending calculations', async () => {
      const user = await createTestUser('g1');
      const accountId = await createTestAccount(user.token);
      const category = await createTestCategory(user.token, 'Dining Out');

      const budgetRes = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ categoryId: category.id, amount: 400, month: '2026-09' })
        .expect(201);

      // Create matching EXPENSE transaction inside month
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          categoryId: category.id,
          type: 'EXPENSE',
          amount: 150,
          transactionAt: '2026-09-15T12:00:00.000Z',
        })
        .expect(201);

      const getRes = await request(app.getHttpServer())
        .get(`/budgets/${budgetRes.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(getRes.body.amount).toBe(400);
      expect(getRes.body.spent).toBe(150);
      expect(getRes.body.remaining).toBe(250);
      expect(getRes.body.percentageUsed).toBe(37.5);
    });

    it('should prevent IDOR access to another user budget (404 Not Found)', async () => {
      const user1 = await createTestUser('idor1a');
      const user2 = await createTestUser('idor1b');
      const category1 = await createTestCategory(user1.token, 'Rent');

      const budget = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ categoryId: category1.id, amount: 1500, month: '2026-09' })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/budgets/${budget.body.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .expect(404);
    });
  });

  describe('PATCH /budgets/:id', () => {
    it('should update budget amount and recalculate remaining/percentageUsed', async () => {
      const user = await createTestUser('u1');
      const accountId = await createTestAccount(user.token);
      const category = await createTestCategory(user.token, 'Entertainment');

      const budget = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ categoryId: category.id, amount: 200, month: '2026-09' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          categoryId: category.id,
          type: 'EXPENSE',
          amount: 250,
          transactionAt: '2026-09-10T10:00:00.000Z',
        })
        .expect(201);

      // Spent 250 vs Limit 200 => Remaining = -50, Percentage = 125%
      const beforeUpdate = await request(app.getHttpServer())
        .get(`/budgets/${budget.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(beforeUpdate.body.remaining).toBe(-50);
      expect(beforeUpdate.body.percentageUsed).toBe(125);

      // Increase budget limit to 500
      const updated = await request(app.getHttpServer())
        .patch(`/budgets/${budget.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ amount: 500 })
        .expect(200);

      expect(updated.body.amount).toBe(500);
      expect(updated.body.spent).toBe(250);
      expect(updated.body.remaining).toBe(250);
      expect(updated.body.percentageUsed).toBe(50);
    });
  });

  describe('DELETE /budgets/:id', () => {
    it('should delete budget without deleting transactions', async () => {
      const user = await createTestUser('d1');
      const accountId = await createTestAccount(user.token);
      const category = await createTestCategory(user.token, 'Travel');

      const budget = await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ categoryId: category.id, amount: 1000, month: '2026-09' })
        .expect(201);

      const tx = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          categoryId: category.id,
          type: 'EXPENSE',
          amount: 300,
          transactionAt: '2026-09-05T00:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/budgets/${budget.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      // Budget is deleted
      await request(app.getHttpServer())
        .get(`/budgets/${budget.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(404);

      // Transaction still exists
      const txRes = await request(app.getHttpServer())
        .get(`/transactions/${tx.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(txRes.body.id).toBe(tx.body.id);
    });
  });
});
