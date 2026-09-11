import 'dotenv/config';
import {
  INestApplication,
  ServiceUnavailableException,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { DatabaseService } from '../src/database/database.service';
import { OpenAIClient } from '../src/ai-agent/infrastructure/openai/openai.client';
import { AiAgentService } from '../src/ai-agent/ai-agent.service';
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

describe('AiAgentController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: DatabaseService;
  let aiAgentService: AiAgentService;

  const mockOpenAiClient = {
    createResponse: jest.fn(),
  };

  let userA: { userId: string; email: string; token: string };
  let userB: { userId: string; email: string; token: string };

  async function createTestUser(emailSuffix: string) {
    const email = `ai-agent-e2e-${emailSuffix}-${Date.now()}@finbuddy.dev`;
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
    mockOpenAiClient.createResponse.mockReset();
    jest.clearAllMocks();

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

    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens" CASCADE;`,
    );

    userA = await createTestUser('user-a');
    userB = await createTestUser('user-b');
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.$executeRawUnsafe(
        `TRUNCATE TABLE "users", "user_profiles", "user_identities", "refresh_tokens" CASCADE;`,
      );
      await prisma.$disconnect();
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
      expect(mockOpenAiClient.createResponse).not.toHaveBeenCalled();
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
      expect(mockOpenAiClient.createResponse).not.toHaveBeenCalled();
    });
  });

  describe('2. Input Validation & Defense in Depth', () => {
    it('should return 400 when message is missing', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({})
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('message')]),
      );
      expect(mockOpenAiClient.createResponse).not.toHaveBeenCalled();
    });

    it('should return 400 when message is an empty string', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: '' })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('message')]),
      );
      expect(mockOpenAiClient.createResponse).not.toHaveBeenCalled();
    });

    it('should return 400 when message is not a string (number, boolean, array, object)', async () => {
      for (const invalidValue of [12345, true, ['test'], { text: 'hello' }]) {
        const response = await request(app.getHttpServer())
          .post('/ai-agent/messages')
          .set('Authorization', `Bearer ${userA.token}`)
          .send({ message: invalidValue })
          .expect(400);

        expect(response.body.message).toEqual(
          expect.arrayContaining([
            expect.stringContaining('message must be a string'),
          ]),
        );
      }
      expect(mockOpenAiClient.createResponse).not.toHaveBeenCalled();
    });

    it('should return 400 when message exceeds 2000 characters limit', async () => {
      const oversizedMessage = 'a'.repeat(2001);

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: oversizedMessage })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([
          expect.stringContaining(
            'message must be shorter than or equal to 2000 characters',
          ),
        ]),
      );
      expect(mockOpenAiClient.createResponse).not.toHaveBeenCalled();
    });

    it('should return 400 when unexpected extra properties are sent in body', async () => {
      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
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
      expect(mockOpenAiClient.createResponse).not.toHaveBeenCalled();
    });
  });

  describe('3. User Identity Isolation & Context Boundary', () => {
    it('should reject request attempting to inject userId in request body', async () => {
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
      expect(mockOpenAiClient.createResponse).not.toHaveBeenCalled();
    });

    it('should route user context from verified JWT into service layer', async () => {
      mockOpenAiClient.createResponse.mockResolvedValueOnce(
        'Hello User A, your finances look balanced.',
      );
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
      mockOpenAiClient.createResponse.mockResolvedValueOnce(
        'Hello User B, your finances look balanced.',
      );
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

  describe('4. Successful Message Processing & Length Boundary', () => {
    it('should return 200 with AI assistant response for a valid prompt', async () => {
      mockOpenAiClient.createResponse.mockResolvedValueOnce(
        'Your total balance across accounts is $3,450.00.',
      );

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'What is my total account balance?' })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Your total balance across accounts is $3,450.00.',
      });
      expect(mockOpenAiClient.createResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          input: 'What is my total account balance?',
          instructions: expect.any(String),
        }),
      );
    });

    it('should accept message at exactly 2000 characters limit and return 200', async () => {
      const boundaryMessage = 'x'.repeat(2000);
      mockOpenAiClient.createResponse.mockResolvedValueOnce(
        'Handled 2000 character input successfully.',
      );

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: boundaryMessage })
        .expect(200);

      expect(response.body).toEqual({
        message: 'Handled 2000 character input successfully.',
      });
      expect(mockOpenAiClient.createResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          input: boundaryMessage,
        }),
      );
    });
  });

  describe('5. Upstream Error Mapping & Leak Prevention', () => {
    it('should map OpenAIClient failure to 503 Service Unavailable', async () => {
      mockOpenAiClient.createResponse.mockRejectedValueOnce(
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
      mockOpenAiClient.createResponse.mockRejectedValueOnce(
        new ServiceUnavailableException('AI service temporarily unavailable'),
      );

      const response = await request(app.getHttpServer())
        .post('/ai-agent/messages')
        .set('Authorization', `Bearer ${userA.token}`)
        .send({ message: 'Check leak resistance' })
        .expect(503);

      const responseBodyString = JSON.stringify(response.body);
      const responseRawText = response.text;

      // Ensure zero secrets or internal details leaked in response
      expect(responseRawText).not.toContain('sk-');
      expect(responseRawText).not.toContain('OPENAI_API_KEY');
      expect(responseRawText).not.toContain('FINBUDDY_AGENT_INSTRUCTIONS');
      expect(responseRawText).not.toContain('You are FinBuddy');
      expect(responseBodyString).not.toContain('stack');
      expect(response.body).not.toHaveProperty('stack');
    });
  });
});
