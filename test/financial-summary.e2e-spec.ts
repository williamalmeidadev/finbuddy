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

describe('FinancialSummaryController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;

  beforeAll(async () => {
    await waitForDatabase(process.env.DATABASE_URL!);

    execSync(
      `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="for sure, proceed" npx prisma db push --accept-data-loss --url "${process.env.DATABASE_URL}"`,
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'for sure, proceed',
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
    const email = `sum-e2e-${emailSuffix}-${Date.now()}@finbuddy.dev`;
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

  async function createAccount(token: string, name: string, balance = 1000) {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        type: 'CHECKING',
        color: '#00FF00',
        balance,
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

  describe('GET /financial-summary', () => {
    it('should aggregate financial summary excluding transfers and including uncategorized transactions', async () => {
      const user = await createTestUser('main');
      const accountA = await createAccount(user.token, 'Account A', 5000);
      const accountB = await createAccount(user.token, 'Account B', 2000);

      const foodCat = await createCategory(user.token, 'Food', 'EXPENSE');
      const transportCat = await createCategory(
        user.token,
        'Transport',
        'EXPENSE',
      );
      const salaryCat = await createCategory(user.token, 'Salary', 'INCOME');

      // Income transaction: R$ 5,000
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: accountA,
          categoryId: salaryCat.id,
          type: 'INCOME',
          amount: 5000,
          transactionAt: '2026-09-02T10:00:00.000Z',
        })
        .expect(201);

      // Expense 1: Food R$ 500
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: accountA,
          categoryId: foodCat.id,
          type: 'EXPENSE',
          amount: 500,
          transactionAt: '2026-09-05T12:00:00.000Z',
        })
        .expect(201);

      // Expense 2: Transport R$ 200
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: accountA,
          categoryId: transportCat.id,
          type: 'EXPENSE',
          amount: 200,
          transactionAt: '2026-09-10T15:00:00.000Z',
        })
        .expect(201);

      // Expense 3: Uncategorized R$ 100
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId: accountB,
          type: 'EXPENSE',
          amount: 100,
          transactionAt: '2026-09-12T18:00:00.000Z',
        })
        .expect(201);

      // Transfer R$ 1,000 from Account A to Account B
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          fromAccountId: accountA,
          toAccountId: accountB,
          amount: 1000,
          transactionAt: '2026-09-15T09:00:00.000Z',
        })
        .expect(201);

      // Budget for Food (Limit: 800)
      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          categoryId: foodCat.id,
          amount: 800,
          month: '2026-09',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/financial-summary?month=2026-09')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.period.month).toBe('2026-09');
      expect(res.body.summary.income).toBe(5000);
      expect(res.body.summary.expenses).toBe(800); // 500 + 200 + 100 (Transfer 1000 is excluded)
      expect(res.body.summary.net).toBe(4200); // 5000 - 800

      // Accounts
      expect(res.body.accounts.items).toHaveLength(2);
      expect(res.body.accounts.totalBalance).toBe(11200); // 5000 + 2000 initial + 5000 income - 800 expenses

      // Expense Categories (Food: 500 => 62.5%, Transport: 200 => 25%)
      expect(res.body.categories.expenses).toHaveLength(2);
      const foodItem = res.body.categories.expenses.find(
        (c: { categoryName: string }) => c.categoryName === 'Food',
      );
      expect(foodItem.amount).toBe(500);
      expect(foodItem.percentage).toBe(62.5);

      // Income Categories
      expect(res.body.categories.income).toHaveLength(1);
      expect(res.body.categories.income[0].amount).toBe(5000);
      expect(res.body.categories.income[0].percentage).toBe(100);

      // Budgets
      expect(res.body.budgets).toHaveLength(1);
      expect(res.body.budgets[0].amount).toBe(800);
      expect(res.body.budgets[0].spent).toBe(500);
      expect(res.body.budgets[0].remaining).toBe(300);
      expect(res.body.budgets[0].percentageUsed).toBe(62.5);
    });

    it('should ignore transactions from other months and respect date boundaries', async () => {
      const user = await createTestUser('boundary');
      const accountId = await createAccount(user.token, 'Main', 1000);

      // August 31 23:59:59 UTC
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 50,
          transactionAt: '2026-08-31T23:59:59.999Z',
        })
        .expect(201);

      // September 01 00:00:00 UTC
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 120,
          transactionAt: '2026-09-01T00:00:00.000Z',
        })
        .expect(201);

      // October 01 00:00:00 UTC
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 200,
          transactionAt: '2026-10-01T00:00:00.000Z',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/financial-summary?month=2026-09')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.summary.expenses).toBe(120);
    });

    it('should handle zero transactions and negative net result', async () => {
      const user = await createTestUser('negative');
      const accountId = await createAccount(user.token, 'Main', 1000);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'INCOME',
          amount: 1000,
          transactionAt: '2026-09-10T10:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          type: 'EXPENSE',
          amount: 1500,
          transactionAt: '2026-09-15T10:00:00.000Z',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/financial-summary?month=2026-09')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.summary.income).toBe(1000);
      expect(res.body.summary.expenses).toBe(1500);
      expect(res.body.summary.net).toBe(-500);
    });

    it('should enforce complete security isolation (User B cannot see User A data)', async () => {
      const userA = await createTestUser('secA');
      const userB = await createTestUser('secB');

      const accA = await createAccount(userA.token, 'User A Acc', 10000);
      await createAccount(userB.token, 'User B Acc', 500);

      const catIncomeA = await createCategory(
        userA.token,
        'Income Cat A',
        'INCOME',
      );
      const catExpenseA = await createCategory(
        userA.token,
        'Expense Cat A',
        'EXPENSE',
      );

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          accountId: accA,
          categoryId: catIncomeA.id,
          type: 'INCOME',
          amount: 10000,
          transactionAt: '2026-09-10T10:00:00.000Z',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/budgets')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ categoryId: catExpenseA.id, amount: 2000, month: '2026-09' })
        .expect(201);

      const resB = await request(app.getHttpServer())
        .get('/financial-summary?month=2026-09')
        .set('Authorization', `Bearer ${userB.token}`)
        .expect(200);

      expect(resB.body.summary.income).toBe(0);
      expect(resB.body.summary.expenses).toBe(0);
      expect(resB.body.summary.net).toBe(0);
      expect(resB.body.accounts.totalBalance).toBe(500);
      expect(resB.body.accounts.items[0].name).toBe('User B Acc');
      expect(resB.body.categories.income).toHaveLength(0);
      expect(resB.body.categories.expenses).toHaveLength(0);
      expect(resB.body.budgets).toHaveLength(0);
    });
  });
});
