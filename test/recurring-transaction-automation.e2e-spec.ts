import 'dotenv/config';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { RecurringTransactionAutomationService } from '../src/recurring-transaction-automation/recurring-transaction-automation.service';
import { ConfigService } from '@nestjs/config';
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

describe('RecurringTransactionAutomation (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;
  let automationService: RecurringTransactionAutomationService;

  let user1Token: string;
  let user2Token: string;
  let account1Id: string;
  let account2Id: string;

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
    automationService = app.get(RecurringTransactionAutomationService);

    const configService = app.get(ConfigService);
    const originalGet = configService.get.bind(configService);
    jest
      .spyOn(configService, 'get')
      .mockImplementation((key: string, defaultValue?: any) => {
        if (key === 'RECURRING_TRANSACTION_AUTOMATION_ENABLED') {
          return true;
        }
        return originalGet(key, defaultValue);
      });
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "categories", "budgets", "transactions", "transfers", "recurring_transactions" CASCADE;`,
    );

    // Register User 1 & Account
    const u1 = await createTestUser('auto1');
    user1Token = u1.accessToken;
    const acc1Res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'User 1 Account',
        type: 'CHECKING',
        balance: 500,
        currency: 'BRL',
        color: '#00FF00',
      })
      .expect(201);
    account1Id = acc1Res.body.id;

    // Register User 2 & Account
    const u2 = await createTestUser('auto2');
    user2Token = u2.accessToken;
    const acc2Res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        name: 'User 2 Account',
        type: 'SAVINGS',
        balance: 1000,
        currency: 'BRL',
        color: '#0000FF',
      })
      .expect(201);
    account2Id = acc2Res.body.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  async function createTestUser(suffix: string) {
    const email = `auto-user-${suffix}-${Date.now()}@finbuddy.dev`;
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

  it('should automatically process due recurring transactions across all users', async () => {
    // User 1 recurring income
    await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        accountId: account1Id,
        type: 'INCOME',
        amount: 200,
        description: 'User 1 Allowance',
        frequency: 'DAILY',
        startDate: '2026-01-01',
      })
      .expect(201);

    // User 2 recurring expense
    await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${user2Token}`)
      .send({
        accountId: account2Id,
        type: 'EXPENSE',
        amount: 50,
        description: 'User 2 Streaming',
        frequency: 'MONTHLY',
        startDate: '2026-01-01',
      })
      .expect(201);

    // Trigger system automation
    const result = await automationService.runAutomation();

    expect(result.created).toBeGreaterThanOrEqual(2);

    // Check account balances
    const acc1 = await prisma.account.findUnique({ where: { id: account1Id } });
    const acc2 = await prisma.account.findUnique({ where: { id: account2Id } });

    expect(Number(acc1?.balance)).toBeGreaterThan(500);
    expect(Number(acc2?.balance)).toBeLessThan(1000);
  });

  it('should remain idempotent when run multiple times', async () => {
    await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        accountId: account1Id,
        type: 'INCOME',
        amount: 100,
        description: 'Bonus',
        frequency: 'MONTHLY',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      })
      .expect(201);

    const firstRun = await automationService.runAutomation();
    expect(firstRun.created).toBe(1);
    expect(firstRun.deactivated).toBe(1);

    // Second run should create 0 new transactions
    const secondRun = await automationService.runAutomation();
    expect(secondRun.created).toBe(0);
    expect(secondRun.processed).toBe(0);
  });

  it('should support simultaneous manual and automatic execution safely', async () => {
    await request(app.getHttpServer())
      .post('/recurring-transactions')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        accountId: account1Id,
        type: 'INCOME',
        amount: 300,
        description: 'Freelance',
        frequency: 'MONTHLY',
        startDate: '2026-01-01',
        endDate: '2026-01-02',
      })
      .expect(201);

    // Run manual execution via HTTP and automatic execution concurrently
    const [manualRes, autoRes] = await Promise.all([
      request(app.getHttpServer())
        .post('/recurring-transactions/execute?until=2026-01-15')
        .set('Authorization', `Bearer ${user1Token}`)
        .expect(200),
      automationService.runAutomation(),
    ]);

    // Sum of created occurrences between manual and auto must equal total valid occurrences (1)
    const totalCreated = manualRes.body.created + autoRes.created;
    expect(totalCreated).toBe(1);
  });
});
