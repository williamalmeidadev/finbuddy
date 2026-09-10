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

describe('TransferController (e2e)', () => {
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
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "transactions", "transfers" CASCADE;`,
    );
  });

  async function createTestUser(emailSuffix: string) {
    const email = `tr-e2e-${emailSuffix}-${Date.now()}@finbuddy.dev`;
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

  async function createTestAccount(
    token: string,
    name: string,
    initialBalance = 1000,
    currency = 'BRL',
  ) {
    const res = await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name,
        type: 'CHECKING',
        color: '#123456',
        balance: initialBalance,
        currency,
      })
      .expect(201);

    return res.body as { id: string; balance: number; isActive: boolean };
  }

  describe('POST /transfers', () => {
    it('should return 401 when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/transfers')
        .send({
          fromAccountId: '00000000-0000-0000-0000-000000000001',
          toAccountId: '00000000-0000-0000-0000-000000000002',
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(401);
    });

    it('should create a valid transfer, decrease source balance, and increase destination balance', async () => {
      const user = await createTestUser('valid-transfer');
      const acc1 = await createTestAccount(user.token, 'Checking', 1000);
      const acc2 = await createTestAccount(user.token, 'Savings', 500);

      const response = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          fromAccountId: acc1.id,
          toAccountId: acc2.id,
          amount: 300,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      expect(response.body).toEqual(
        expect.objectContaining({
          fromAccountId: acc1.id,
          toAccountId: acc2.id,
          amount: 300,
        }),
      );

      // Verify updated account balances
      const updatedAcc1 = await request(app.getHttpServer())
        .get(`/accounts/${acc1.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      const updatedAcc2 = await request(app.getHttpServer())
        .get(`/accounts/${acc2.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(updatedAcc1.body.balance).toBe(700);
      expect(updatedAcc2.body.balance).toBe(800);

      // Verify transaction entries created for both accounts
      const txs = await request(app.getHttpServer())
        .get('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(txs.body).toHaveLength(2);
    });

    it('should reject same-account transfer', async () => {
      const user = await createTestUser('same-account');
      const acc = await createTestAccount(user.token, 'Checking', 1000);

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          fromAccountId: acc.id,
          toAccountId: acc.id,
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should reject cross-user transfer (User A to User B)', async () => {
      const userA = await createTestUser('cross-user-a');
      const userB = await createTestUser('cross-user-b');

      const accA = await createTestAccount(userA.token, 'Acc A', 1000);
      const accB = await createTestAccount(userB.token, 'Acc B', 1000);

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          fromAccountId: accA.id,
          toAccountId: accB.id,
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(404);
    });

    it('should reject transfer with insufficient balance', async () => {
      const user = await createTestUser('insufficient-balance');
      const acc1 = await createTestAccount(user.token, 'Low Balance', 100);
      const acc2 = await createTestAccount(user.token, 'Destination', 500);

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          fromAccountId: acc1.id,
          toAccountId: acc2.id,
          amount: 500,
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should reject transfer involving inactive source account', async () => {
      const user = await createTestUser('inactive-source');
      const acc1 = await createTestAccount(user.token, 'Source', 1000);
      const acc2 = await createTestAccount(user.token, 'Dest', 500);

      await request(app.getHttpServer())
        .delete(`/accounts/${acc1.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          fromAccountId: acc1.id,
          toAccountId: acc2.id,
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should reject transfer between accounts with different currencies', async () => {
      const user = await createTestUser('currency-mismatch');
      const accBRL = await createTestAccount(
        user.token,
        'BRL Acc',
        1000,
        'BRL',
      );
      const accUSD = await createTestAccount(
        user.token,
        'USD Acc',
        1000,
        'USD',
      );

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          fromAccountId: accBRL.id,
          toAccountId: accUSD.id,
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should reject unwhitelisted payload properties', async () => {
      const user = await createTestUser('extra-payload');
      const acc1 = await createTestAccount(user.token, 'Acc 1', 1000);
      const acc2 = await createTestAccount(user.token, 'Acc 2', 500);

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          fromAccountId: acc1.id,
          toAccountId: acc2.id,
          amount: 100,
          transactionAt: new Date().toISOString(),
          extraProperty: 'forbidden',
        })
        .expect(400);
    });
  });

  describe('GET /transfers', () => {
    it('should list only transfers belonging to authenticated user accounts', async () => {
      const userA = await createTestUser('list-tr-a');
      const userB = await createTestUser('list-tr-b');

      const accA1 = await createTestAccount(userA.token, 'A1', 1000);
      const accA2 = await createTestAccount(userA.token, 'A2', 500);

      const accB1 = await createTestAccount(userB.token, 'B1', 1000);
      const accB2 = await createTestAccount(userB.token, 'B2', 500);

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          fromAccountId: accA1.id,
          toAccountId: accA2.id,
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          fromAccountId: accB1.id,
          toAccountId: accB2.id,
          amount: 200,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      const resA = await request(app.getHttpServer())
        .get('/transfers')
        .set('Authorization', `Bearer ${userA.token}`)
        .expect(200);

      expect(resA.body).toHaveLength(1);
      expect(resA.body[0].fromAccountId).toBe(accA1.id);
    });
  });

  describe('GET /transfers/:id', () => {
    it('should return 400 for malformed UUID', async () => {
      const user = await createTestUser('tr-uuid');

      await request(app.getHttpServer())
        .get('/transfers/not-a-valid-uuid')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(400);
    });

    it('should return 404 when User A requests User B transfer (IDOR prevention)', async () => {
      const userA = await createTestUser('tr-idor-a');
      const userB = await createTestUser('tr-idor-b');

      const accB1 = await createTestAccount(userB.token, 'B1', 1000);
      const accB2 = await createTestAccount(userB.token, 'B2', 500);

      const trRes = await request(app.getHttpServer())
        .post('/transfers')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({
          fromAccountId: accB1.id,
          toAccountId: accB2.id,
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      await request(app.getHttpServer())
        .get(`/transfers/${trRes.body.id}`)
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
