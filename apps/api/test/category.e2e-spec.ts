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

describe('CategoryController (e2e)', () => {
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
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "categories", "transactions" CASCADE;`,
    );
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  async function createTestUser(emailSuffix: string) {
    const email = `cat-e2e-${emailSuffix}-${Date.now()}@finbuddy.dev`;
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
        balance: 1000,
      })
      .expect(201);
    return res.body.id as string;
  }

  describe('POST /categories', () => {
    it('should create an income category successfully', async () => {
      const user = await createTestUser('c1');

      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Salary',
          type: 'INCOME',
          color: '#00FF00',
          icon: 'wallet',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe('Salary');
      expect(res.body.type).toBe('INCOME');
      expect(res.body.isActive).toBe(true);
    });

    it('should enforce case-insensitive duplicate category name prevention per user and type', async () => {
      const user = await createTestUser('c2');

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Groceries',
          type: 'EXPENSE',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'groceries',
          type: 'EXPENSE',
        })
        .expect(409);
    });

    it('should allow same category name under different category types', async () => {
      const user = await createTestUser('c3');

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Investments',
          type: 'INCOME',
        })
        .expect(201);

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Investments',
          type: 'EXPENSE',
        })
        .expect(201);
    });

    it('should validate HEX color format', async () => {
      const user = await createTestUser('c4');

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          name: 'Invalid Color',
          type: 'EXPENSE',
          color: 'red',
        })
        .expect(400);
    });
  });

  describe('GET /categories', () => {
    it('should list categories owned by user', async () => {
      const user1 = await createTestUser('list1');
      const user2 = await createTestUser('list2');

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ name: 'User 1 Cat', type: 'INCOME' });

      await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user2.token}`)
        .send({ name: 'User 2 Cat', type: 'EXPENSE' });

      const res = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${user1.token}`)
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].name).toBe('User 1 Cat');
    });

    it('should filter by type and handle includeInactive flag', async () => {
      const user = await createTestUser('list3');

      const cat1Res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Active Income', type: 'INCOME' });

      const cat2Res = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Active Expense', type: 'EXPENSE' });

      await request(app.getHttpServer())
        .delete(`/categories/${cat2Res.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      const incomeOnly = await request(app.getHttpServer())
        .get('/categories?type=INCOME')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(incomeOnly.body).toHaveLength(1);
      expect(incomeOnly.body[0].id).toBe(cat1Res.body.id);

      const activeOnly = await request(app.getHttpServer())
        .get('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(activeOnly.body).toHaveLength(1);

      const allCat = await request(app.getHttpServer())
        .get('/categories?includeInactive=true')
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(allCat.body).toHaveLength(2);
    });
  });

  describe('GET /categories/:id', () => {
    it('should return category details when found', async () => {
      const user = await createTestUser('get1');

      const created = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Health', type: 'EXPENSE' });

      const res = await request(app.getHttpServer())
        .get(`/categories/${created.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.name).toBe('Health');
    });

    it('should prevent IDOR access to another user category', async () => {
      const user1 = await createTestUser('idor1');
      const user2 = await createTestUser('idor2');

      const cat = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user1.token}`)
        .send({ name: 'Private Cat', type: 'EXPENSE' });

      await request(app.getHttpServer())
        .get(`/categories/${cat.body.id}`)
        .set('Authorization', `Bearer ${user2.token}`)
        .expect(404);
    });
  });

  describe('PATCH /categories/:id', () => {
    it('should update category fields', async () => {
      const user = await createTestUser('patch1');

      const cat = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Food', type: 'EXPENSE' });

      const res = await request(app.getHttpServer())
        .patch(`/categories/${cat.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Supermarket', color: '#123456' })
        .expect(200);

      expect(res.body.name).toBe('Supermarket');
      expect(res.body.color).toBe('#123456');
    });
  });

  describe('DELETE /categories/:id', () => {
    it('should soft deactivate category', async () => {
      const user = await createTestUser('del1');

      const cat = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Subscriptions', type: 'EXPENSE' });

      const res = await request(app.getHttpServer())
        .delete(`/categories/${cat.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      expect(res.body.isActive).toBe(false);
    });
  });

  describe('Transaction Module Integration with Categories', () => {
    it('should associate active matching category with transaction', async () => {
      const user = await createTestUser('txcat1');
      const accountId = await createTestAccount(user.token);

      const cat = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Salary', type: 'INCOME' })
        .expect(201);

      const tx = await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          categoryId: cat.body.id,
          type: 'INCOME',
          amount: 500,
          transactionAt: new Date().toISOString(),
        })
        .expect(201);

      expect(tx.body.categoryId).toBe(cat.body.id);
    });

    it('should reject creating transaction with mismatched category type', async () => {
      const user = await createTestUser('txcat2');
      const accountId = await createTestAccount(user.token);

      const cat = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Salary', type: 'INCOME' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          categoryId: cat.body.id,
          type: 'EXPENSE',
          amount: 50,
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });

    it('should reject creating transaction with inactive category', async () => {
      const user = await createTestUser('txcat3');
      const accountId = await createTestAccount(user.token);

      const cat = await request(app.getHttpServer())
        .post('/categories')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ name: 'Old Bonus', type: 'INCOME' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/categories/${cat.body.id}`)
        .set('Authorization', `Bearer ${user.token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/transactions')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          accountId,
          categoryId: cat.body.id,
          type: 'INCOME',
          amount: 100,
          transactionAt: new Date().toISOString(),
        })
        .expect(400);
    });
  });
});
