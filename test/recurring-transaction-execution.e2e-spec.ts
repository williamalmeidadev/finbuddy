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
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - startTime > timeoutMs) {
          reject(
            new Error(
              `Database port ${port} not reachable after ${timeoutMs}ms`,
            ),
          );
        } else {
          setTimeout(tryConnect, 300);
        }
      });
    };
    tryConnect();
  });
}

describe('RecurringTransactionExecution (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;

  let user1Token: string;
  let user2Token: string;
  let account1Id: string;
  let category1Id: string;

  beforeAll(async () => {
    await waitForDatabase(testDbUrl);
    execSync(
      `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION="for sure" DATABASE_URL="${testDbUrl}" npx prisma db push --accept-data-loss`,
      { stdio: 'inherit' },
    );

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(DatabaseService);
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "categories", "budgets", "transactions", "transfers", "recurring_transactions" CASCADE;`,
    );

    // Register & Login User 1
    const u1 = await createTestUser('u1');
    user1Token = u1.accessToken;

    // Register & Login User 2
    const u2 = await createTestUser('u2');
    user2Token = u2.accessToken;

    // Create Account for User 1
    const accRes = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Checking Account',
        type: 'CHECKING',
        balance: 1000,
        currency: 'BRL',
        color: '#00FF00',
      })
      .expect(201);
    account1Id = accRes.body.id;

    // Create Category for User 1
    const catRes = await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Salary',
        type: 'INCOME',
        icon: 'wallet',
        color: '#00FF00',
      })
      .expect(201);
    category1Id = catRes.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function createTestUser(suffix: string) {
    const email = `exec-user-${suffix}-${Date.now()}@finbuddy.dev`;
    const password = 'Password123!';

    await request(app.getHttpServer())
      .post('/users')
      .send({ email, password })
      .expect(201);

    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    return {
      accessToken: loginRes.body.accessToken,
    };
  }

  it('should execute due monthly recurring income transaction and update account balance', async () => {
    // Create Monthly Recurring Income starting 2026-01-01
    await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        accountId: account1Id,
        categoryId: category1Id,
        type: 'INCOME',
        amount: 500,
        description: 'Monthly Salary',
        frequency: 'MONTHLY',
        startDate: '2026-01-01',
      })
      .expect(201);

    // Execute until 2026-03-15 (should trigger Jan 1, Feb 1, Mar 1 = 3 occurrences)
    const res = await request(app.getHttpServer())
      .post('/recurring-transactions/execute?until=2026-03-15')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    expect(res.body).toEqual({
      processed: 3,
      created: 3,
      skipped: 0,
      deactivated: 0,
    });

    // Check account balance: initial 1000 + (3 * 500) = 2500
    const acc = await prisma.account.findUnique({
      where: { id: account1Id },
    });
    expect(Number(acc?.balance)).toBe(2500);

    // Re-running execution with same until date should process 0 occurrences (idempotency)
    const resRetry = await request(app.getHttpServer())
      .post('/recurring-transactions/execute?until=2026-03-15')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    expect(resRetry.body).toEqual({
      processed: 0,
      created: 0,
      skipped: 0,
      deactivated: 0,
    });
  });

  it('should deactivate recurring transaction when reaching end date', async () => {
    // Create Daily Recurring Expense with end date
    await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        accountId: account1Id,
        type: 'EXPENSE',
        amount: 10,
        description: 'Daily Coffee',
        frequency: 'DAILY',
        startDate: '2026-01-01',
        endDate: '2026-01-03',
      })
      .expect(201);

    // Execute until 2026-01-10
    const res = await request(app.getHttpServer())
      .post('/recurring-transactions/execute?until=2026-01-10')
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);

    // Occurrences: Jan 1, Jan 2, Jan 3 (Jan 4 > Jan 3 end date -> deactivated)
    expect(res.body.created).toBe(3);
    expect(res.body.deactivated).toBe(1);

    // Check that recurring transaction is marked inactive
    const recs = await prisma.recurringTransaction.findMany({
      where: { accountId: account1Id },
    });
    expect(recs[0].isActive).toBe(false);
  });

  it('should enforce user isolation (User 2 cannot execute User 1 definitions)', async () => {
    await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        accountId: account1Id,
        type: 'INCOME',
        amount: 500,
        description: 'Salary',
        frequency: 'MONTHLY',
        startDate: '2026-01-01',
      })
      .expect(201);

    // User 2 runs execution
    const resUser2 = await request(app.getHttpServer())
      .post('/recurring-transactions/execute?until=2026-03-15')
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);

    expect(resUser2.body).toEqual({
      processed: 0,
      created: 0,
      skipped: 0,
      deactivated: 0,
    });
  });
});
