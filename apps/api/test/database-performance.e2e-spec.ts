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

describe('Database Performance & Concurrency Regression (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;

  beforeAll(async () => {
    await waitForDatabase(process.env.DATABASE_URL!);

    execSync(
      `DATABASE_URL="${process.env.DATABASE_URL}" npx prisma db push --accept-data-loss --schema=prisma/schema.prisma`,
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
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "categories", "budgets", "transactions", "transfers", "recurring_transactions" CASCADE;`,
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createTestUser(suffix: string) {
    const email = `perf-e2e-${suffix}-${Date.now()}@finbuddy.dev`;
    const password = 'Password123!';

    const createRes = await request(app.getHttpServer())
      .post('/users')
      .send({ email, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return {
      userId: createRes.body.id as string,
      email,
      token: loginRes.body.accessToken as string,
    };
  }

  async function createAccount(
    token: string,
    name: string,
    balance = 1000,
    currency = 'BRL',
  ) {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        type: 'CHECKING',
        color: '#123456',
        balance,
        currency,
      })
      .expect(201);

    return res.body as { id: string; balance: number; isActive: boolean };
  }

  async function createCategory(
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

  async function createTransaction(
    token: string,
    data: {
      accountId: string;
      categoryId?: string;
      type: 'INCOME' | 'EXPENSE';
      amount: number;
      description?: string;
      transactionAt: string;
    },
  ) {
    const res = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .expect(201);

    return res.body;
  }

  async function createBudget(
    token: string,
    data: {
      categoryId: string;
      amount: number;
      month: string;
    },
  ) {
    const res = await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .expect(201);

    return res.body;
  }

  async function createRecurringTransaction(
    token: string,
    data: {
      accountId: string;
      categoryId?: string;
      type: 'INCOME' | 'EXPENSE';
      amount: number;
      description?: string;
      frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
      startDate: string;
      endDate?: string;
    },
  ) {
    const res = await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(data)
      .expect(201);

    return res.body;
  }

  describe('Budget Spending Batch Calculation Accuracy', () => {
    it('should accurately aggregate spending across multiple category budgets per month without N+1 discrepancies', async () => {
      const user = await createTestUser('budget-batch');
      const account = await createAccount(user.token, 'Main Account', 5000);

      const catA = await createCategory(user.token, 'Groceries', 'EXPENSE');
      const catB = await createCategory(user.token, 'Entertainment', 'EXPENSE');
      const catC = await createCategory(user.token, 'Utilities', 'EXPENSE');
      const catIncome = await createCategory(user.token, 'Cashback', 'INCOME');

      // Create budgets for month 2026-05
      await createBudget(user.token, {
        categoryId: catA.id,
        amount: 500,
        month: '2026-05',
      });
      await createBudget(user.token, {
        categoryId: catB.id,
        amount: 300,
        month: '2026-05',
      });
      await createBudget(user.token, {
        categoryId: catC.id,
        amount: 200,
        month: '2026-05',
      });

      // Create budget for month 2026-06 (Cat A)
      await createBudget(user.token, {
        categoryId: catA.id,
        amount: 600,
        month: '2026-06',
      });

      // Transactions for 2026-05
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catA.id,
        type: 'EXPENSE',
        amount: 150,
        description: 'Supermarket',
        transactionAt: '2026-05-05T10:00:00.000Z',
      });
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catA.id,
        type: 'EXPENSE',
        amount: 100,
        description: 'Bakery',
        transactionAt: '2026-05-15T12:00:00.000Z',
      });
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catB.id,
        type: 'EXPENSE',
        amount: 120,
        description: 'Concert ticket',
        transactionAt: '2026-05-20T19:00:00.000Z',
      });
      // Income in 2026-05 should not affect expense spending
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catIncome.id,
        type: 'INCOME',
        amount: 1000,
        description: 'Cashback',
        transactionAt: '2026-05-10T14:00:00.000Z',
      });

      // Transactions for 2026-06
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catA.id,
        type: 'EXPENSE',
        amount: 80,
        description: 'Produce',
        transactionAt: '2026-06-02T11:00:00.000Z',
      });

      // Query month 2026-05
      const resMay = await request(app.getHttpServer())
        .get('/budgets?month=2026-05')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(resMay.body).toHaveLength(3);

      const budgetMayA = resMay.body.find(
        (b: { categoryId: string }) => b.categoryId === catA.id,
      );
      const budgetMayB = resMay.body.find(
        (b: { categoryId: string }) => b.categoryId === catB.id,
      );
      const budgetMayC = resMay.body.find(
        (b: { categoryId: string }) => b.categoryId === catC.id,
      );

      // Cat A: 150 + 100 = 250 spent out of 500
      expect(budgetMayA.amount).toBe(500);
      expect(budgetMayA.spent).toBe(250);
      expect(budgetMayA.remaining).toBe(250);
      expect(budgetMayA.percentageUsed).toBe(50);

      // Cat B: 120 spent out of 300
      expect(budgetMayB.amount).toBe(300);
      expect(budgetMayB.spent).toBe(120);
      expect(budgetMayB.remaining).toBe(180);
      expect(budgetMayB.percentageUsed).toBe(40);

      // Cat C: 0 spent out of 200 (unspent category defaults to 0)
      expect(budgetMayC.amount).toBe(200);
      expect(budgetMayC.spent).toBe(0);
      expect(budgetMayC.remaining).toBe(200);
      expect(budgetMayC.percentageUsed).toBe(0);

      // Query all budgets (multi-month batch resolution)
      const resAll = await request(app.getHttpServer())
        .get('/budgets')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(resAll.body).toHaveLength(4);

      const budgetJuneA = resAll.body.find(
        (b: { categoryId: string; month: string }) =>
          b.categoryId === catA.id && b.month.startsWith('2026-06'),
      );
      expect(budgetJuneA).toBeDefined();
      expect(budgetJuneA.amount).toBe(600);
      expect(budgetJuneA.spent).toBe(80);
      expect(budgetJuneA.remaining).toBe(520);
      expect(budgetJuneA.percentageUsed).toBe(13.33);
    });
  });

  describe('Financial Summary Totals Single-Pass Aggregation Accuracy', () => {
    it('should correctly aggregate income and expense sums matching transaction totals in a single pass', async () => {
      const user = await createTestUser('fin-sum');
      const account = await createAccount(user.token, 'Primary', 10000);

      const catSalary = await createCategory(user.token, 'Salary', 'INCOME');
      const catLiving = await createCategory(user.token, 'Living', 'EXPENSE');

      // Transactions in target month (2026-07)
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catSalary.id,
        type: 'INCOME',
        amount: 3000,
        description: 'Main Salary',
        transactionAt: '2026-07-05T09:00:00.000Z',
      });
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catSalary.id,
        type: 'INCOME',
        amount: 500,
        description: 'Bonus',
        transactionAt: '2026-07-20T10:00:00.000Z',
      });
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catLiving.id,
        type: 'EXPENSE',
        amount: 450,
        description: 'Groceries',
        transactionAt: '2026-07-08T15:00:00.000Z',
      });
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catLiving.id,
        type: 'EXPENSE',
        amount: 1200,
        description: 'Rent',
        transactionAt: '2026-07-15T12:00:00.000Z',
      });
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catLiving.id,
        type: 'EXPENSE',
        amount: 50,
        description: 'Pharmacy',
        transactionAt: '2026-07-25T17:00:00.000Z',
      });

      // Out-of-range transactions to confirm boundaries
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catSalary.id,
        type: 'INCOME',
        amount: 1000,
        description: 'June Salary',
        transactionAt: '2026-06-30T23:59:59.000Z',
      });
      await createTransaction(user.token, {
        accountId: account.id,
        categoryId: catLiving.id,
        type: 'EXPENSE',
        amount: 700,
        description: 'August Bill',
        transactionAt: '2026-08-01T00:00:01.000Z',
      });

      // Query target month
      const res = await request(app.getHttpServer())
        .get('/financial-summary?month=2026-07')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.period.month).toBe('2026-07');
      expect(res.body.summary.income).toBe(3500);
      expect(res.body.summary.expenses).toBe(1700);
      expect(res.body.summary.net).toBe(1800);

      // Verify category aggregates match
      const incomeCat = res.body.categories.income.find(
        (c: { categoryId: string }) => c.categoryId === catSalary.id,
      );
      expect(incomeCat.amount).toBe(3500);

      const expenseCat = res.body.categories.expenses.find(
        (c: { categoryId: string }) => c.categoryId === catLiving.id,
      );
      expect(expenseCat.amount).toBe(1700);

      // Query month with zero transactions
      const resEmpty = await request(app.getHttpServer())
        .get('/financial-summary?month=2026-01')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(resEmpty.body.period.month).toBe('2026-01');
      expect(resEmpty.body.summary.income).toBe(0);
      expect(resEmpty.body.summary.expenses).toBe(0);
      expect(resEmpty.body.summary.net).toBe(0);
    });
  });

  describe('Parallel Transfer Execution Concurrency Safety', () => {
    it('should safely prevent balance overdraft when 2 simultaneous transfers race against an account with balance 100', async () => {
      const user = await createTestUser('transfer-concurrency');
      const acc1 = await createAccount(user.token, 'Source Checking', 100);
      const acc2 = await createAccount(user.token, 'Destination Savings', 0);

      const transferPayload = {
        fromAccountId: acc1.id,
        toAccountId: acc2.id,
        amount: 80,
        transactionAt: new Date().toISOString(),
      };

      // Fire 2 simultaneous HTTP requests of 80 each against balance 100
      const [res1, res2] = await Promise.all([
        request(app.getHttpServer())
          .post('/transfers')
          .set('Authorization', `Bearer ${user.token}`)
          .send(transferPayload),
        request(app.getHttpServer())
          .post('/transfers')
          .set('Authorization', `Bearer ${user.token}`)
          .send(transferPayload),
      ]);

      const responses = [res1, res2];
      const succeeded = responses.filter((r) => r.status === 201);
      const failed = responses.filter((r) => r.status === 400);

      // Exactly 1 request succeeds (201 Created)
      expect(succeeded).toHaveLength(1);
      // Exactly 1 request fails with 400 Bad Request
      expect(failed).toHaveLength(1);
      expect(failed[0].body.message).toMatch(
        /Insufficient balance for transfer/i,
      );

      // Final account balances must be exactly 20 and 80
      const updatedAcc1 = await request(app.getHttpServer())
        .get(`/accounts/${acc1.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      const updatedAcc2 = await request(app.getHttpServer())
        .get(`/accounts/${acc2.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(updatedAcc1.body.balance).toBe(20);
      expect(updatedAcc2.body.balance).toBe(80);

      // Direct database verification
      const dbAcc1 = await prisma.account.findUnique({
        where: { id: acc1.id },
      });
      const dbAcc2 = await prisma.account.findUnique({
        where: { id: acc2.id },
      });
      expect(Number(dbAcc1!.balance)).toBe(20);
      expect(Number(dbAcc2!.balance)).toBe(80);

      // Exactly 1 transfer record created
      const dbTransfers = await prisma.transfer.findMany();
      expect(dbTransfers).toHaveLength(1);

      // Exactly 2 transactions created (1 DEBIT, 1 CREDIT)
      const dbTransactions = await prisma.transaction.findMany();
      expect(dbTransactions).toHaveLength(2);
    });
  });

  describe('Parallel Recurring Transaction Execution Idempotency', () => {
    it('should process exactly 1 occurrence and avoid duplicate transactions under concurrent execution requests', async () => {
      const user = await createTestUser('recurring-idempotency');
      const account = await createAccount(
        user.token,
        'Recurring Account',
        1000,
      );
      const category = await createCategory(
        user.token,
        'Subscription',
        'EXPENSE',
      );

      const recurring = await createRecurringTransaction(user.token, {
        accountId: account.id,
        categoryId: category.id,
        type: 'EXPENSE',
        amount: 150,
        description: 'Streaming service',
        frequency: 'MONTHLY',
        startDate: '2026-02-01',
      });

      // Send 2 simultaneous execution requests for until=2026-02-15
      const [exec1, exec2] = await Promise.all([
        request(app.getHttpServer())
          .post('/recurring-transactions/execute?until=2026-02-15')
          .set('Authorization', `Bearer ${user.token}`),
        request(app.getHttpServer())
          .post('/recurring-transactions/execute?until=2026-02-15')
          .set('Authorization', `Bearer ${user.token}`),
      ]);

      expect(exec1.status).toBe(200);
      expect(exec2.status).toBe(200);

      // Across both requests, exactly 1 transaction occurrence was created
      const totalCreated = exec1.body.created + exec2.body.created;
      expect(totalCreated).toBe(1);

      // Direct database verification: exactly 1 transaction created for this recurring definition
      const dbTransactions = await prisma.transaction.findMany({
        where: { recurringTransactionId: recurring.id },
      });
      expect(dbTransactions).toHaveLength(1);
      expect(Number(dbTransactions[0].amount)).toBe(150);

      // Account balance must have been decremented exactly once (1000 - 150 = 850)
      const dbAccount = await prisma.account.findUnique({
        where: { id: account.id },
      });
      expect(Number(dbAccount!.balance)).toBe(850);

      // Subsequent execution should find 0 due occurrences
      const repeatRes = await request(app.getHttpServer())
        .post('/recurring-transactions/execute?until=2026-02-15')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(repeatRes.body.created).toBe(0);
      expect(repeatRes.body.processed).toBe(0);
    });
  });
});
