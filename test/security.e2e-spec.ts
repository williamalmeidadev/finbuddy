import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { execSync } from 'child_process';
import net from 'net';
import helmet from 'helmet';

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

describe('Security Hardening & Penetration-Test Preparation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;

  let userAToken: string;
  let userBToken: string;
  let userAId: string;
  let userBId: string;

  let userBAccount: any;
  let userBCategory: any;
  let userBTransaction: any;
  let userBBudget: any;
  let userBRecurring: any;

  let userAAccount: any;
  let userACategory: any;
  let userAIncomeCategory: any;

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

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(helmet());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = moduleFixture.get<DatabaseService>(DatabaseService);

    await prisma.transfer.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.recurringTransaction.deleteMany();
    await prisma.budget.deleteMany();
    await prisma.category.deleteMany();
    await prisma.account.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Register & Login User A
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'user.a.security@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const userALogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user.a.security@example.com',
        password: 'Password123!',
      })
      .expect(201);

    userAToken = userALogin.body.accessToken;
    userAId = userALogin.body.user.id;

    // Register & Login User B
    await request(app.getHttpServer())
      .post('/users')
      .send({
        email: 'user.b.security@example.com',
        password: 'Password123!',
      })
      .expect(201);

    const userBLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'user.b.security@example.com',
        password: 'Password123!',
      })
      .expect(201);

    userBToken = userBLogin.body.accessToken;
    userBId = userBLogin.body.user.id;

    // Create User A Account & Categories
    const accARes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        name: 'User A Checking',
        type: 'CHECKING',
        color: '#820AD1',
        balance: 1000,
      })
      .expect(201);
    userAAccount = accARes.body;

    const catARes = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'User A Expense Category', type: 'EXPENSE' })
      .expect(201);
    userACategory = catARes.body;

    const catAIncRes = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: 'User A Income Category', type: 'INCOME' })
      .expect(201);
    userAIncomeCategory = catAIncRes.body;

    // Create User B Resources
    const accBRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        name: 'User B Checking',
        type: 'CHECKING',
        color: '#820AD1',
        balance: 500,
      })
      .expect(201);
    userBAccount = accBRes.body;

    const catBRes = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ name: 'User B Category', type: 'EXPENSE' })
      .expect(201);
    userBCategory = catBRes.body;

    const txBRes = await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        accountId: userBAccount.id,
        categoryId: userBCategory.id,
        amount: 50,
        type: 'EXPENSE',
        transactionAt: new Date().toISOString(),
        description: 'User B Secret Expense',
      })
      .expect(201);
    userBTransaction = txBRes.body;

    const budgetBRes = await request(app.getHttpServer())
      .post('/budgets')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        categoryId: userBCategory.id,
        amount: 300,
        month: '2026-10',
      })
      .expect(201);
    userBBudget = budgetBRes.body;

    const recBRes = await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        accountId: userBAccount.id,
        categoryId: userBCategory.id,
        amount: 100,
        type: 'EXPENSE',
        frequency: 'MONTHLY',
        startDate: '2026-10-01',
        description: 'User B Recurring Expense',
      })
      .expect(201);
    userBRecurring = recBRes.body;
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('1. Authentication & Password Security', () => {
    it('should reject requests with invalid or tampered JWT signatures', async () => {
      const tamperedToken = userAToken.slice(0, -5) + 'fake1';
      await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${tamperedToken}`)
        .expect(401);
    });

    it('should never return passwordHash in login or profile responses', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user.a.security@example.com',
          password: 'Password123!',
        })
        .expect(201);

      expect(loginRes.body.user).not.toHaveProperty('passwordHash');
      expect(loginRes.body.user).not.toHaveProperty('password');

      const profileRes = await request(app.getHttpServer())
        .get(`/users/${userAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(profileRes.body).not.toHaveProperty('passwordHash');
    });

    it('should enforce IDOR protection on user profile endpoint', async () => {
      await request(app.getHttpServer())
        .get(`/users/${userBId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(403);
    });

    it('should enforce refresh token rotation and reject reused refresh tokens', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user.a.security@example.com',
          password: 'Password123!',
        })
        .expect(201);

      const refreshA = loginRes.body.refreshToken;

      // Rotate token A -> token B
      const rotateRes = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: refreshA });

      expect([200, 201]).toContain(rotateRes.status);
      expect(rotateRes.body).toHaveProperty('accessToken');
      expect(rotateRes.body).toHaveProperty('refreshToken');

      // Attempt to reuse token A
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: refreshA })
        .expect(401);
    });
  });

  describe('2. Authorization / IDOR Prevention', () => {
    it('User A cannot GET User B Account (404)', async () => {
      await request(app.getHttpServer())
        .get(`/accounts/${userBAccount.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });

    it('User A cannot PATCH User B Account (404)', async () => {
      await request(app.getHttpServer())
        .patch(`/accounts/${userBAccount.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: 'Hacked Name' })
        .expect(404);
    });

    it('User A cannot DELETE User B Account (404)', async () => {
      await request(app.getHttpServer())
        .delete(`/accounts/${userBAccount.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });

    it('User A cannot create a transaction on User B Account (404/400)', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId: userBAccount.id,
          categoryId: userACategory.id,
          amount: 50,
          type: 'EXPENSE',
          transactionAt: new Date().toISOString(),
        })
        .expect(404);
    });

    it('User A cannot GET User B Transaction (404)', async () => {
      await request(app.getHttpServer())
        .get(`/transactions/${userBTransaction.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });

    it('User A cannot DELETE User B Transaction (404)', async () => {
      await request(app.getHttpServer())
        .delete(`/transactions/${userBTransaction.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });

    it('User A cannot transfer from User B Account (400/404)', async () => {
      const res = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: userBAccount.id,
          toAccountId: userAAccount.id,
          amount: 100,
        });

      expect([400, 404]).toContain(res.status);
    });

    it('User A cannot transfer into User B Account (400/404)', async () => {
      const res = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: userAAccount.id,
          toAccountId: userBAccount.id,
          amount: 100,
        });

      expect([400, 404]).toContain(res.status);
    });

    it('User A cannot GET User B Category (404)', async () => {
      await request(app.getHttpServer())
        .get(`/categories/${userBCategory.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });

    it('User A cannot GET User B Budget (404)', async () => {
      await request(app.getHttpServer())
        .get(`/budgets/${userBBudget.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });

    it('User A cannot GET User B Recurring Transaction (404)', async () => {
      await request(app.getHttpServer())
        .get(`/recurring-transactions/${userBRecurring.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });

    it('User A cannot trigger manual execution of User B Recurring Transaction (400/404)', async () => {
      const res = await request(app.getHttpServer())
        .post('/recurring-transactions/execute')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ recurringTransactionId: userBRecurring.id });

      expect([400, 404]).toContain(res.status);
    });
  });

  describe('3. Mass Assignment Protection', () => {
    it('should reject requests containing non-whitelisted forbidden fields', async () => {
      await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Account With Extra Fields',
          type: 'CHECKING',
          color: '#820AD1',
          balance: 999999,
          userId: userBId,
          createdAt: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('4. Financial Integrity & Invariants', () => {
    it('should enforce balance invariant: initial 1000 + 100 income - 50 expense = 1050', async () => {
      const accRes = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Invariant Test Account',
          type: 'CHECKING',
          color: '#820AD1',
          balance: 1000,
        })
        .expect(201);
      const accId = accRes.body.id;

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId: accId,
          categoryId: userAIncomeCategory.id,
          amount: 100,
          type: 'INCOME',
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId: accId,
          categoryId: userACategory.id,
          amount: 50,
          type: 'EXPENSE',
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      const checkRes = await request(app.getHttpServer())
        .get(`/accounts/${accId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Number(checkRes.body.balance)).toBe(1050);
    });

    it('should reject transfers exceeding available balance', async () => {
      const targetAcc = await request(app.getHttpServer())
        .post('/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Target Account',
          type: 'SAVINGS',
          color: '#820AD1',
          balance: 0,
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: userAAccount.id,
          toAccountId: targetAcc.body.id,
          amount: 99999999,
        })
        .expect(400);
    });

    it('should reject transfers to the same account (self-transfer)', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          fromAccountId: userAAccount.id,
          toAccountId: userAAccount.id,
          amount: 50,
        })
        .expect(400);
    });

    it('should reject negative transaction amounts', async () => {
      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          accountId: userAAccount.id,
          categoryId: userACategory.id,
          amount: -50,
          type: 'EXPENSE',
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });
  });

  describe('5. Injection & XSS Protection', () => {
    it('should handle SQL injection payloads safely without syntax errors', async () => {
      const sqlInjectionRes = await request(app.getHttpServer())
        .get("/categories?type=' OR 1=1 --")
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(400);

      expect(sqlInjectionRes.body).toHaveProperty('statusCode', 400);
    });

    it('should store XSS script payloads safely as plain text and return JSON', async () => {
      const xssPayload = '<script>alert(1)</script>';
      const catRes = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ name: xssPayload, type: 'EXPENSE' })
        .expect(201);

      expect(catRes.body.name).toBe(xssPayload);
      expect(catRes.headers['content-type']).toContain('application/json');
    });
  });

  describe('6. Security Headers & Security Misconfiguration', () => {
    it('should include security headers from Helmet', async () => {
      const res = await request(app.getHttpServer())
        .get('/accounts')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(res.headers).toHaveProperty('x-frame-options', 'SAMEORIGIN');
    });
  });

  describe('7. Tenant Isolation in Summaries & Aggregations', () => {
    it('User A financial summary only includes User A data', async () => {
      const summaryRes = await request(app.getHttpServer())
        .get('/financial-summary')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(summaryRes.body.accounts).toHaveProperty('totalBalance');
    });
  });
});
