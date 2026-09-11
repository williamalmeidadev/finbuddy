import 'dotenv/config';
import {
  INestApplication,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
process.env.THROTTLE_LIMIT = '1000';
process.env.THROTTLE_AUTH_LIMIT = '1000';

import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { OpenAIClient } from '../src/ai-agent/infrastructure/openai/openai.client';
import { AiAgentService } from '../src/ai-agent/ai-agent.service';
import { execSync } from 'child_process';
import net from 'net';
import { AccountType, TransactionType } from '../src/generated/prisma/enums';

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
  if (!urlObj.pathname.endsWith('_test')) {
    urlObj.pathname =
      urlObj.pathname === '/finbuddy'
        ? '/finbuddy_test'
        : urlObj.pathname + '_test';
  }
  testDbUrl = urlObj.toString();
} catch {
  testDbUrl = originalUrl.endsWith('_test')
    ? originalUrl
    : originalUrl + '_test';
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

describe('AiAgentController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;
  let aiAgentService: AiAgentService;
  let jwtService: JwtService;
  let userCounter = 0;

  const mockOpenAiClient = {
    createResponse: jest.fn(),
    createRawResponse: jest.fn(),
  };

  async function createTestUser(emailSuffix: string) {
    userCounter++;
    const email = `ai-agent-e2e-${emailSuffix}-${userCounter}-${Date.now()}-${Math.random().toString(36).substring(7)}@finbuddy.dev`;

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash:
          '$2b$10$ep/0kS84fQJ28gM74hQZ5O/52c6a.YV6NfJg.t.jXn8Z1kZ5O',
      },
    });

    const token = await jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      userId: user.id,
      email: user.email,
      token,
    };
  }

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
    })
      .overrideProvider(OpenAIClient)
      .useValue(mockOpenAiClient)
      .compile();

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
    aiAgentService = app.get(AiAgentService);
    jwtService = app.get(JwtService);
  }, 30000);

  beforeEach(async () => {
    mockOpenAiClient.createResponse.mockReset();
    mockOpenAiClient.createRawResponse.mockReset();
    jest.clearAllMocks();

    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "categories", "transactions", "budgets" CASCADE;`,
    );
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens", "accounts", "categories", "transactions", "budgets" CASCADE;`,
      );
      await prisma.$disconnect();
    }
    if (app) {
      await app.close();
    }
  });

  describe('1. Authentication & Authorization Security', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .send({ message: 'Hello FinBuddy' })
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 401,
          message: 'Unauthorized',
        }),
      );
      expect(mockOpenAiClient.createRawResponse).not.toHaveBeenCalled();
    });

    it('should reject request with invalid Bearer token with 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', 'Bearer invalid-token-12345')
        .send({ message: 'Hello FinBuddy' })
        .expect(401);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 401,
          message: 'Unauthorized',
        }),
      );
      expect(mockOpenAiClient.createRawResponse).not.toHaveBeenCalled();
    });
  });

  describe('2. Input Validation & Defense in Depth', () => {
    it('should return 400 when message is missing', async () => {
      const user = await createTestUser('input-val');
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${user.token}`)
        .send({})
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('message')]),
      );
      expect(mockOpenAiClient.createRawResponse).not.toHaveBeenCalled();
    });

    it('should return 400 when message is an empty string', async () => {
      const user = await createTestUser('input-val');
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ message: '' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('message')]),
      );
      expect(mockOpenAiClient.createRawResponse).not.toHaveBeenCalled();
    });

    it('should return 400 when message is not a string (number, boolean, array, object)', async () => {
      const user = await createTestUser('input-val');
      for (const invalidValue of [12345, true, ['test'], { text: 'hello' }]) {
        const response = await request(app.getHttpServer())
          .post('/ai-agent/messages')
          .set('Authorization', `Bearer ${user.token}`)
          .send({ message: invalidValue })
          .expect(400);

        expect(response.body.message).toEqual(
          expect.arrayContaining([
            expect.stringContaining('message must be a string'),
          ]),
        );
      }
      expect(mockOpenAiClient.createRawResponse).not.toHaveBeenCalled();
    });

    it('should return 400 when message exceeds 2000 characters limit', async () => {
      const user = await createTestUser('input-val');
      const oversizedMessage = 'a'.repeat(2001);

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${user.token}`)
        .send({ message: oversizedMessage })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'message must be shorter than or equal to 2000 characters',
          ),
        ]),
      );
      expect(mockOpenAiClient.createRawResponse).not.toHaveBeenCalled();
    });

    it('should return 400 when unexpected extra properties are sent in body', async () => {
      const user = await createTestUser('input-val');
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${user.token}`)
        .send({
          message: 'Hello FinBuddy',
          unexpectedField: 'malicious-data',
          adminRole: true,
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('property unexpectedField should not exist'),
          expect.stringContaining('property adminRole should not exist'),
        ]),
      );
      expect(mockOpenAiClient.createRawResponse).not.toHaveBeenCalled();
    });
  });

  describe('3. User Identity Isolation & Context Boundary', () => {
    it('should reject request attempting to inject userId in request body', async () => {
      const userA = await createTestUser('user-a');
      const userB = await createTestUser('user-b');
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          message: 'Check accounts',
          userId: userB.userId,
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining('property userId should not exist'),
        ]),
      );
      expect(mockOpenAiClient.createRawResponse).not.toHaveBeenCalled();
    });

    it('should route user context from verified JWT into service layer', async () => {
      const userA = await createTestUser('user-a');
      mockOpenAiClient.createRawResponse.mockResolvedValueOnce({
        id: 'resp-1',
        outputText: 'Hello User A, your finances look balanced.',
        functionCalls: [],
      });
      const sendMessageSpy = jest.spyOn(aiAgentService, 'sendMessage');

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'Hello AI' })
        .expect(200);

      expect(sendMessageSpy).toHaveBeenCalledWith(userA.userId, 'Hello AI');
      expect(response.body).toEqual({
        message: 'Hello User A, your finances look balanced.',
      });
    });

    it('should maintain strict separation of user context across different users', async () => {
      const userB = await createTestUser('user-b');
      mockOpenAiClient.createRawResponse.mockResolvedValueOnce({
        id: 'resp-2',
        outputText: 'Hello User B, your finances look balanced.',
        functionCalls: [],
      });
      const sendMessageSpy = jest.spyOn(aiAgentService, 'sendMessage');

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userB.token}`)
        .send({ message: 'Hello AI from B' })
        .expect(200);

      expect(sendMessageSpy).toHaveBeenCalledWith(
        userB.userId,
        'Hello AI from B',
      );
      expect(response.body).toEqual({
        message: 'Hello User B, your finances look balanced.',
      });
    });
  });

  describe('4. Financial Read Tools Integration', () => {
    it('should execute get_accounts tool and return user accounts', async () => {
      const userA = await createTestUser('user-a');
      const account = await prisma.account.create({
        data: {
          userId: userA.userId,
          name: 'User A Checking',
          type: AccountType.CHECKING,
          balance: 1500,
          currency: 'BRL',
          color: '#123456',
        },
      });

      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-tool-1',
          outputText: '',
          functionCalls: [
            { callId: 'call-acc', name: 'get_accounts', arguments: {} },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-tool-2',
          outputText: `You have 1 account named ${account.name} with balance ${account.balance.toString()}.`,
          functionCalls: [],
        });

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'What are my accounts?' })
        .expect(200);

      expect(response.body.message).toContain('User A Checking');
      expect(mockOpenAiClient.createRawResponse).toHaveBeenCalledTimes(2);

      const secondCallArgs =
        mockOpenAiClient.createRawResponse.mock.calls[1][0];
      expect(secondCallArgs.input[0].call_id).toBe('call-acc');
      const toolOutput = JSON.parse(secondCallArgs.input[0].output);
      expect(toolOutput.success).toBe(true);
      expect(toolOutput.data).toEqual([
        expect.objectContaining({
          id: account.id,
          name: 'User A Checking',
          balance: 1500,
        }),
      ]);
    });

    it('should execute get_transactions tool and return user transactions', async () => {
      const userA = await createTestUser('user-a');
      const account = await prisma.account.create({
        data: {
          userId: userA.userId,
          name: 'User A Main Account',
          type: AccountType.CHECKING,
          balance: 2000,
          currency: 'BRL',
          color: '#000000',
        },
      });

      const transaction = await prisma.transaction.create({
        data: {
          accountId: account.id,
          type: TransactionType.EXPENSE,
          amount: 150.75,
          description: 'Grocery shopping',
          transactionAt: new Date('2026-03-10'),
        },
      });

      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-tx-1',
          outputText: '',
          functionCalls: [
            {
              callId: 'call-tx',
              name: 'get_transactions',
              arguments: { accountId: account.id, limit: 10 },
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-tx-2',
          outputText: `You spent 150.75 on Grocery shopping.`,
          functionCalls: [],
        });

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'Show recent transactions' })
        .expect(200);

      expect(response.body.message).toContain('Grocery shopping');
      const secondCallArgs =
        mockOpenAiClient.createRawResponse.mock.calls[1][0];
      const toolOutput = JSON.parse(secondCallArgs.input[0].output);
      expect(toolOutput.success).toBe(true);
      expect(toolOutput.data[0].id).toBe(transaction.id);
    });

    it('should execute get_financial_summary tool and return monthly summary', async () => {
      const userA = await createTestUser('user-a');
      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-sum-1',
          outputText: '',
          functionCalls: [
            {
              callId: 'call-sum',
              name: 'get_financial_summary',
              arguments: { month: '2026-03' },
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-sum-2',
          outputText: 'Your income for 2026-03 was 0.',
          functionCalls: [],
        });

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'Get my summary for 2026-03' })
        .expect(200);

      expect(response.body.message).toContain('2026-03');
      const secondCallArgs =
        mockOpenAiClient.createRawResponse.mock.calls[1][0];
      const toolOutput = JSON.parse(secondCallArgs.input[0].output);
      expect(toolOutput.success).toBe(true);
      expect(toolOutput.data.period.month).toBe('2026-03');
    });

    it('should execute get_budgets tool and return user budgets', async () => {
      const userA = await createTestUser('user-a');
      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-bud-1',
          outputText: '',
          functionCalls: [
            { callId: 'call-bud', name: 'get_budgets', arguments: {} },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-bud-2',
          outputText: 'You have no budgets set.',
          functionCalls: [],
        });

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'What budgets do I have?' })
        .expect(200);

      expect(response.body.message).toContain('no budgets');
      const secondCallArgs =
        mockOpenAiClient.createRawResponse.mock.calls[1][0];
      const toolOutput = JSON.parse(secondCallArgs.input[0].output);
      expect(toolOutput.success).toBe(true);
      expect(toolOutput.data).toEqual([]);
    });
  });

  describe('5. Application Authorization Boundary & IDOR Protection', () => {
    it('should prevent user A from accessing user B account data via model-generated UUIDs', async () => {
      const userA = await createTestUser('user-a');
      const userB = await createTestUser('user-b');
      const userBAccount = await prisma.account.create({
        data: {
          userId: userB.userId,
          name: 'User B Secret Account',
          type: AccountType.INVESTMENT,
          balance: 999999,
          currency: 'USD',
          color: '#FF0000',
        },
      });

      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-idor-1',
          outputText: '',
          functionCalls: [
            {
              callId: 'call-idor',
              name: 'get_transactions',
              arguments: { accountId: userBAccount.id },
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-idor-2',
          outputText: 'Account not found.',
          functionCalls: [],
        });

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({
          message: `Get transactions for account ${userBAccount.id}`,
        })
        .expect(200);

      const secondCallArgs =
        mockOpenAiClient.createRawResponse.mock.calls[1][0];
      const toolOutput = JSON.parse(secondCallArgs.input[0].output);

      expect(toolOutput.success).toBe(false);
      expect(toolOutput.error).toContain('Account not found');
      expect(JSON.stringify(response.body)).not.toContain('User B Secret');
      expect(JSON.stringify(response.body)).not.toContain('999999');
    });
  });

  describe('6. Tool Abuse & Iteration Bounds', () => {
    it('should handle unknown tool requests safely without crashing', async () => {
      const userA = await createTestUser('user-a');
      mockOpenAiClient.createRawResponse
        .mockResolvedValueOnce({
          id: 'resp-badtool-1',
          outputText: '',
          functionCalls: [
            {
              callId: 'call-bad',
              name: 'delete_database',
              arguments: {},
            },
          ],
        })
        .mockResolvedValueOnce({
          id: 'resp-badtool-2',
          outputText: 'I cannot execute that tool.',
          functionCalls: [],
        });

      await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'Delete database' })
        .expect(200);

      const secondCallArgs =
        mockOpenAiClient.createRawResponse.mock.calls[1][0];
      const toolOutput = JSON.parse(secondCallArgs.input[0].output);
      expect(toolOutput.success).toBe(false);
      expect(toolOutput.error).toBe('Unknown tool: delete_database');
    });

    it('should terminate with 503 when tool loop reaches max iterations (5)', async () => {
      const userA = await createTestUser('user-a');
      mockOpenAiClient.createRawResponse.mockResolvedValue({
        id: 'resp-loop',
        outputText: '',
        functionCalls: [
          { callId: 'call-loop', name: 'get_accounts', arguments: {} },
        ],
      });

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'Looping query' })
        .expect(503);

      expect(response.body.message).toContain(
        'AI agent exceeded maximum allowed tool steps',
      );
      expect(mockOpenAiClient.createRawResponse).toHaveBeenCalledTimes(5);
    });
  });

  describe('7. Upstream Error Mapping & Secret Leakage Prevention', () => {
    it('should map OpenAIClient failure to 503 Service Unavailable', async () => {
      const userA = await createTestUser('user-a');
      mockOpenAiClient.createRawResponse.mockRejectedValueOnce(
        new ServiceUnavailableException('AI service temporarily unavailable'),
      );

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'Trigger provider failure' })
        .expect(503);

      expect(response.body).toEqual(
        expect.objectContaining({
          statusCode: 503,
          message: 'AI service temporarily unavailable',
          requestId: expect.any(String),
        }),
      );
      expect(response.headers).toHaveProperty('x-request-id');
    });

    it('should never leak API keys, raw stack trace, or internal instructions to client', async () => {
      const userA = await createTestUser('user-a');
      mockOpenAiClient.createRawResponse.mockRejectedValueOnce(
        new ServiceUnavailableException('AI service temporarily unavailable'),
      );

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'Check leak resistance' })
        .expect(503);

      const responseBodyString = JSON.stringify(response.body);
      const responseRawText = response.text;

      expect(responseRawText).not.toContain('sk-');
      expect(responseRawText).not.toContain('OPENAI_API_KEY');
      expect(responseRawText).not.toContain('FINBUDDY_AGENT_INSTRUCTIONS');
      expect(responseRawText).not.toContain('You are FinBuddy');
      expect(responseBodyString).not.toContain('stack');
      expect(response.body).not.toHaveProperty('stack');
    });
  });
});
