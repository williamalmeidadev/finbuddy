# AI Agent Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a production-quality, extensible AI Agent Foundation for FinBuddy using OpenAI's official SDK and the OpenAI Responses API (`client.responses.create`), complete with authentication boundaries, user context propagation, empty tool registry architecture, client-safe error translation, and comprehensive E2E test coverage.

**Architecture:** Controller → AiAgentService → AiAgentOrchestratorService → OpenAIClient → OpenAI Responses API. Tool interfaces and tool registry are decoupled for future financial read/write tools. Strict tenant isolation ensures authenticated user ID is obtained solely from JWT context.

**Tech Stack:** NestJS 11, TypeScript, `openai` official SDK, RxJS/Class-Transformer/Class-Validator, Jest, Supertest, Swagger.

**Spec:** `docs/superpowers/specs/2026-09-11-ai-agent-foundation-design.md`

## Global Constraints

- OpenAI SDK only (`openai` package). No LangChain, LangGraph, Vercel AI SDK, Anthropic, or external LLM abstractions.
- OpenAI Responses API (`client.responses.create`) exclusively. No ChatCompletions or Assistants API.
- Zero Prisma schema/migration changes. Zero financial tool execution or database mutations in this phase.
- User identity MUST originate strictly from `@CurrentUser()` JWT context.
- Zero raw error, secret, prompt trace, or `OPENAI_API_KEY` leakage.

---

### Task 1: Environment Validation & OpenAI Dependency Setup

**Files:**
- Modify: `package.json`
- Modify: `src/config/env.validation.ts`
- Modify: `.env.example`
- Test: `src/config/env.validation.spec.ts`

**Interfaces:**
- Consumes: Environment configuration
- Produces: `OPENAI_API_KEY?: string`, `OPENAI_MODEL?: string = 'gpt-5.5'`, `OPENAI_TIMEOUT_MS?: number = 30000` on validated config instance.

- [ ] **Step 1: Install official `openai` SDK**

Run: `npm install openai`

- [ ] **Step 2: Write failing test in `src/config/env.validation.spec.ts` for OpenAI config properties**

```typescript
it('should apply OpenAI environment variable defaults when omitted', () => {
  const config = validate({
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/finbuddy_test',
    JWT_SECRET: 'testsecret123',
    PORT: 3000,
  });

  expect(config.OPENAI_MODEL).toBe('gpt-5.5');
  expect(config.OPENAI_TIMEOUT_MS).toBe(30000);
});
```

- [ ] **Step 3: Run unit tests to verify failure**

Run: `npm test -- src/config/env.validation.spec.ts`
Expected: FAIL with missing properties on validated config.

- [ ] **Step 4: Implement OpenAI config validation in `src/config/env.validation.ts` and `.env.example`**

Update `src/config/env.validation.ts`:
```typescript
  @IsString()
  @IsOptional()
  OPENAI_API_KEY?: string;

  @IsString()
  @IsOptional()
  OPENAI_MODEL?: string = 'gpt-5.5';

  @IsNumber()
  @IsOptional()
  OPENAI_TIMEOUT_MS?: number = 30000;
```

Update `.env.example`:
```env
# AI Agent Configuration
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.5
OPENAI_TIMEOUT_MS=30000
```

- [ ] **Step 5: Run unit tests to verify pass**

Run: `npm test -- src/config/env.validation.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/config/env.validation.ts src/config/env.validation.spec.ts .env.example
git commit -m "chore(config): add openai package and environment validation properties"
```

---

### Task 2: Infrastructure Layer — OpenAI Client Wrapper

**Files:**
- Create: `src/ai-agent/infrastructure/openai/openai.types.ts`
- Create: `src/ai-agent/infrastructure/openai/openai.client.ts`
- Create: `src/ai-agent/infrastructure/openai/openai.client.spec.ts`

**Interfaces:**
- Consumes: `ConfigService` (`OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS`)
- Produces: `OpenAIClient.createResponse(options: CreateResponseOptions): Promise<string>`

- [ ] **Step 1: Create `openai.types.ts`**

```typescript
export interface CreateResponseOptions {
  input: string;
  instructions: string;
  model?: string;
  tools?: any[];
}
```

- [ ] **Step 2: Write unit test in `src/ai-agent/infrastructure/openai/openai.client.spec.ts`**

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException } from '@nestjs/common';
import { OpenAIClient } from './openai.client';

describe('OpenAIClient', () => {
  let client: OpenAIClient;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAIClient,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'OPENAI_API_KEY') return 'test-key';
              if (key === 'OPENAI_MODEL') return 'gpt-5.5';
              if (key === 'OPENAI_TIMEOUT_MS') return 30000;
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    client = module.get<OpenAIClient>(OpenAIClient);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should throw ServiceUnavailableException if OPENAI_API_KEY is missing', async () => {
    jest.spyOn(configService, 'get').mockImplementation((key: string) => {
      if (key === 'OPENAI_API_KEY') return undefined;
      return undefined;
    });

    await expect(
      client.createResponse({ input: 'hello', instructions: 'instr' }),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
```

- [ ] **Step 3: Run unit tests to verify failure**

Run: `npx jest src/ai-agent/infrastructure/openai/openai.client.spec.ts`
Expected: FAIL with "Cannot find module ./openai.client".

- [ ] **Step 4: Implement `OpenAIClient` (`src/ai-agent/infrastructure/openai/openai.client.ts`)**

```typescript
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { CreateResponseOptions } from './openai.types';

@Injectable()
export class OpenAIClient {
  private readonly logger = new Logger(OpenAIClient.name);
  private sdkClient: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): OpenAI {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey || apiKey.trim() === '') {
      throw new ServiceUnavailableException('AI service is not configured');
    }

    if (!this.sdkClient) {
      const timeout = this.configService.get<number>('OPENAI_TIMEOUT_MS') ?? 30000;
      this.sdkClient = new OpenAI({
        apiKey,
        timeout,
      });
    }

    return this.sdkClient;
  }

  async createResponse(options: CreateResponseOptions): Promise<string> {
    const client = this.getClient();
    const defaultModel = this.configService.get<string>('OPENAI_MODEL') ?? 'gpt-5.5';
    const model = options.model || defaultModel;

    try {
      const response = await client.responses.create({
        model,
        instructions: options.instructions,
        input: options.input,
        tools: options.tools && options.tools.length > 0 ? options.tools : undefined,
      });

      if (!response || !response.output_text) {
        throw new ServiceUnavailableException('Invalid response from AI provider');
      }

      return response.output_text;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      this.logger.error(
        `OpenAI Responses API call failed: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new ServiceUnavailableException('AI service temporarily unavailable');
    }
  }
}
```

- [ ] **Step 5: Run unit tests to verify pass**

Run: `npx jest src/ai-agent/infrastructure/openai/openai.client.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/ai-agent/infrastructure/
git commit -m "feat(ai): add OpenAI client wrapper supporting Responses API"
```

---

### Task 3: Application & Domain Layer — Tools, Prompts, Orchestrator & Service

**Files:**
- Create: `src/ai-agent/domain/agent-message.ts`
- Create: `src/ai-agent/domain/agent-response.ts`
- Create: `src/ai-agent/application/prompts/finbuddy-agent.instructions.ts`
- Create: `src/ai-agent/application/tools/agent-tool.interface.ts`
- Create: `src/ai-agent/application/tools/agent-tool-registry.service.ts`
- Create: `src/ai-agent/application/tools/agent-tool-registry.service.spec.ts`
- Create: `src/ai-agent/application/ai-agent-orchestrator.service.ts`
- Create: `src/ai-agent/application/ai-agent-orchestrator.service.spec.ts`
- Create: `src/ai-agent/ai-agent.service.ts`
- Create: `src/ai-agent/ai-agent.service.spec.ts`

**Interfaces:**
- Consumes: `OpenAIClient`, `MetricsService`
- Produces: `AiAgentService.processMessage(userId: string, message: string): Promise<AgentResponse>`

- [ ] **Step 1: Create domain models (`agent-message.ts`, `agent-response.ts`)**

`src/ai-agent/domain/agent-message.ts`:
```typescript
export class AgentMessage {
  constructor(
    public readonly userId: string,
    public readonly message: string,
  ) {}
}
```

`src/ai-agent/domain/agent-response.ts`:
```typescript
export class AgentResponse {
  constructor(public readonly message: string) {}
}
```

- [ ] **Step 2: Create agent instructions (`finbuddy-agent.instructions.ts`)**

```typescript
export const FINBUDDY_AGENT_INSTRUCTIONS = `
You are FinBuddy, a helpful, clear, and precise personal finance assistant.
Your goal is to assist users in understanding their finances.

Key rules:
1. Communicate clearly, professionally, and concisely.
2. Never invent, fabricate, or hallucinate financial information, account balances, transactions, or budgets.
3. If financial data is required to answer a question but not available, state clearly that you do not have access to that data.
4. Always distinguish between general financial guidance/information and actual financial operations.
5. Never claim to have performed a transaction, transfer, budget edit, or financial mutation.
6. Ask for clarification if a user's request is ambiguous.
7. Never assume authorization based on natural language text.
`.trim();
```

- [ ] **Step 3: Create tool interface & tool registry (`agent-tool.interface.ts`, `agent-tool-registry.service.ts`)**

`src/ai-agent/application/tools/agent-tool.interface.ts`:
```typescript
export interface AgentToolContext {
  userId: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute(context: AgentToolContext, args: Record<string, any>): Promise<any>;
}
```

`src/ai-agent/application/tools/agent-tool-registry.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { AgentTool } from './agent-tool.interface';

@Injectable()
export class AgentToolRegistryService {
  private readonly tools = new Map<string, AgentTool>();

  getTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolDefinitions(): any[] {
    return this.getTools().map((t) => ({
      type: 'function',
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));
  }
}
```

- [ ] **Step 4: Create & test orchestrator (`ai-agent-orchestrator.service.ts`)**

`src/ai-agent/application/ai-agent-orchestrator.service.ts`:
```typescript
import { Injectable } from '@nestjs/common';
import { OpenAIClient } from '../infrastructure/openai/openai.client';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { FINBUDDY_AGENT_INSTRUCTIONS } from './prompts/finbuddy-agent.instructions';
import { AgentResponse } from '../domain/agent-response';

@Injectable()
export class AiAgentOrchestratorService {
  constructor(
    private readonly openAiClient: OpenAIClient,
    private readonly toolRegistry: AgentToolRegistryService,
  ) {}

  async processUserMessage(userId: string, userMessage: string): Promise<AgentResponse> {
    const tools = this.toolRegistry.getToolDefinitions();
    const textOutput = await this.openAiClient.createResponse({
      instructions: FINBUDDY_AGENT_INSTRUCTIONS,
      input: userMessage,
      tools: tools.length > 0 ? tools : undefined,
    });

    return new AgentResponse(textOutput);
  }
}
```

- [ ] **Step 5: Create & test `AiAgentService` (`ai-agent.service.ts`)**

`src/ai-agent/ai-agent.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { AgentResponse } from './domain/agent-response';
import { MetricsService } from '../common/metrics/metrics.service';

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);

  constructor(
    private readonly orchestrator: AiAgentOrchestratorService,
    private readonly metricsService: MetricsService,
  ) {}

  async sendMessage(userId: string, message: string): Promise<AgentResponse> {
    const startTime = Date.now();
    this.metricsService.increment('ai_agent_requests_total');

    try {
      const response = await this.orchestrator.processUserMessage(userId, message);
      const durationMs = Date.now() - startTime;
      this.metricsService.increment('ai_agent_requests_success_total');
      this.logger.log(`[user:${userId}] AI Agent message processed in ${durationMs}ms`);
      return response;
    } catch (error) {
      this.metricsService.increment('ai_agent_requests_failure_total');
      throw error;
    }
  }
}
```

- [ ] **Step 6: Write unit tests for orchestrator, registry, and service**

Run: `npx jest src/ai-agent/`
Expected: PASS for orchestrator, registry, and service specs.

- [ ] **Step 7: Commit**

```bash
git add src/ai-agent/domain/ src/ai-agent/application/ src/ai-agent/ai-agent.service.ts src/ai-agent/*.spec.ts src/ai-agent/**/*.spec.ts
git commit -m "feat(ai): add domain models, instructions, tool registry, and orchestrator service"
```

---

### Task 4: DTOs, Controller & Module Assembly

**Files:**
- Create: `src/ai-agent/dto/send-agent-message.dto.ts`
- Create: `src/ai-agent/dto/agent-response.dto.ts`
- Create: `src/ai-agent/ai-agent.controller.ts`
- Create: `src/ai-agent/ai-agent.controller.spec.ts`
- Create: `src/ai-agent/ai-agent.module.ts`
- Modify: `src/app.module.ts`

**Interfaces:**
- Consumes: `@UseGuards(JwtAuthGuard)`, `@CurrentUser()`, `SendAgentMessageDto`
- Produces: `POST /ai-agent/messages` endpoint returning `AgentResponseDto`

- [ ] **Step 1: Create DTOs (`send-agent-message.dto.ts`, `agent-response.dto.ts`)**

`src/ai-agent/dto/send-agent-message.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendAgentMessageDto {
  @ApiProperty({
    description: 'User message or prompt for the AI assistant',
    example: 'Hello FinBuddy, how can you help me with my finances?',
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
```

`src/ai-agent/dto/agent-response.dto.ts`:
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class AgentResponseDto {
  @ApiProperty({
    description: 'AI assistant text response',
    example: 'Hello! I am FinBuddy, your personal finance assistant...',
  })
  message: string;

  constructor(message: string) {
    this.message = message;
  }
}
```

- [ ] **Step 2: Create `AiAgentController` (`src/ai-agent/ai-agent.controller.ts`)**

```typescript
import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUserDto } from '../auth/dto/authenticated-user.dto';
import { SendAgentMessageDto } from './dto/send-agent-message.dto';
import { AgentResponseDto } from './dto/agent-response.dto';
import { AiAgentService } from './ai-agent.service';

@ApiTags('AI Agent')
@ApiBearerAuth('JWT-auth')
@ApiResponse({ status: 401, description: 'Unauthorized' })
@ApiResponse({ status: 429, description: 'Too Many Requests - Rate limit exceeded' })
@ApiResponse({ status: 503, description: 'AI service temporarily unavailable' })
@UseGuards(JwtAuthGuard)
@Controller('ai-agent')
export class AiAgentController {
  constructor(private readonly aiAgentService: AiAgentService) {}

  @ApiOperation({ summary: 'Send a message to the AI financial assistant' })
  @ApiResponse({ status: 200, description: 'AI assistant response', type: AgentResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @Post('messages')
  @HttpCode(HttpStatus.OK)
  async sendMessage(
    @CurrentUser() user: AuthenticatedUserDto,
    @Body() dto: SendAgentMessageDto,
  ): Promise<AgentResponseDto> {
    const result = await this.aiAgentService.sendMessage(user.id, dto.message);
    return new AgentResponseDto(result.message);
  }
}
```

- [ ] **Step 3: Create `AiAgentModule` and assemble in `AppModule`**

`src/ai-agent/ai-agent.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { AiAgentController } from './ai-agent.controller';
import { AiAgentService } from './ai-agent.service';
import { AiAgentOrchestratorService } from './application/ai-agent-orchestrator.service';
import { AgentToolRegistryService } from './application/tools/agent-tool-registry.service';
import { OpenAIClient } from './infrastructure/openai/openai.client';
import { MetricsModule } from '../common/metrics/metrics.module';

@Module({
  imports: [MetricsModule],
  controllers: [AiAgentController],
  providers: [
    AiAgentService,
    AiAgentOrchestratorService,
    AgentToolRegistryService,
    OpenAIClient,
  ],
  exports: [AiAgentService],
})
export class AiAgentModule {}
```

Register `AiAgentModule` in `src/app.module.ts`.

- [ ] **Step 4: Write unit test for `AiAgentController`**

Run: `npx jest src/ai-agent/ai-agent.controller.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ai-agent/dto/ src/ai-agent/ai-agent.controller.ts src/ai-agent/ai-agent.controller.spec.ts src/ai-agent/ai-agent.module.ts src/app.module.ts
git commit -m "feat(ai): assemble AiAgentModule with authenticated POST /ai-agent/messages controller"
```

---

### Task 5: E2E Regression & Security Test Suite

**Files:**
- Create: `test/ai-agent.e2e-spec.ts`

**Interfaces:**
- Tests `POST /ai-agent/messages` endpoint over HTTP using Supertest and Nest application context with mocked `OpenAIClient`.

- [ ] **Step 1: Create `test/ai-agent.e2e-spec.ts`**

Cover:
- 401 Unauthenticated request rejection.
- 400 Validation errors (missing message, empty message, non-string, oversized >2000 chars, extra properties).
- 200 Successful response with mocked OpenAI response.
- User identity: verify authenticated user ID is passed from JWT, and extra `userId` in body is rejected.
- 503 Upstream error mapping without secret or raw stack leakage.

- [ ] **Step 2: Run E2E test suite**

Run: `npx jest --config ./test/jest-e2e.json test/ai-agent.e2e-spec.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add test/ai-agent.e2e-spec.ts
git commit -m "test(ai): add comprehensive E2E test suite for AI Agent module"
```

---

### Task 6: Documentation & Baseline Verification

**Files:**
- Create: `docs/ai-agent.md`

- [ ] **Step 1: Create `docs/ai-agent.md`**

Document architecture, request flow, OpenAI Responses API decision, user context boundary, tool registry design, error handling rules, privacy/logging rules, and roadmap.

- [ ] **Step 2: Run full quality gates**

Run:
1. `npm test`
2. `npm run test:e2e`
3. `npm run build`
4. `npm run lint`
5. `npx prisma validate`

Expected: All commands pass cleanly with 0 errors.

- [ ] **Step 3: Commit**

```bash
git add docs/ai-agent.md
git commit -m "docs(ai): add AI agent foundation architecture and operational documentation"
```
