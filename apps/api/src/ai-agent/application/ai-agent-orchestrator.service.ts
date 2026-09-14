import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { OpenAIClient } from '../infrastructure/openai/openai.client';
import { OpenAIResponseOutput } from '../infrastructure/openai/openai.types';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from './authorization/agent-tool-authorization.service';
import { AgentToolArgumentValidatorService } from './validation/agent-tool-argument-validator.service';
import { AiConfirmationService } from './ai-confirmation.service';
import { FINBUDDY_AGENT_INSTRUCTIONS } from './prompts/finbuddy-agent.instructions';
import { AgentResponse } from '../domain/agent-response';
import {
  AgentToolContext,
  AgentToolResult,
} from './tools/agent-tool.interface';
import { MetricsService } from '../../common/metrics/metrics.service';
import { AiAgentObservabilityService } from './observability/ai-agent-observability.service';
import {
  AiErrorCode,
  AiEventName,
} from './observability/ai-agent-observability.types';

export interface ProcessUserMessageOptions {
  requestId?: string;
  aiRequestId?: string;
  history?: Array<{ role: 'USER' | 'ASSISTANT'; content: string }>;
  memoryContext?: string;
}

@Injectable()
export class AiAgentOrchestratorService {
  private readonly logger = new Logger(AiAgentOrchestratorService.name);

  constructor(
    private readonly openAiClient: OpenAIClient,
    private readonly toolRegistry: AgentToolRegistryService,
    private readonly authorizationService: AgentToolAuthorizationService,
    private readonly argumentValidator: AgentToolArgumentValidatorService,
    private readonly confirmationService: AiConfirmationService,
    private readonly metricsService: MetricsService,
    private readonly observability: AiAgentObservabilityService,
    private readonly configService: ConfigService,
  ) {}

  async processUserMessage(
    userId: string,
    userMessage: string,
    options?: ProcessUserMessageOptions,
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const requestId = options?.requestId || 'N/A';
    const aiRequestId = options?.aiRequestId || `ai-req-${randomUUID()}`;

    await this.observability.recordEvent({
      event: AiEventName.REQUEST_STARTED,
      requestId,
      aiRequestId,
      userId,
      success: true,
    });

    const tools = this.toolRegistry.getToolDefinitions();
    const context: AgentToolContext = { userId, requestId, aiRequestId };

    const maxToolIterations =
      this.configService.get<number>('OPENAI_MAX_TOOL_ITERATIONS') ?? 5;
    const maxModelCalls =
      this.configService.get<number>('OPENAI_MAX_MODEL_CALLS') ?? 10;

    let iterations = 0;
    let modelCalls = 0;
    let totalToolCalls = 0;
    let currentInput: string | any[] = userMessage;

    const historyItems = options?.history
      ? options.history.map((h) => ({
          role: h.role.toLowerCase(),
          content: h.content,
        }))
      : [];

    if (options?.memoryContext || historyItems.length > 0) {
      const items: any[] = [];
      if (options?.memoryContext) {
        items.push({ role: 'user', content: options.memoryContext });
      }
      if (historyItems.length > 0) {
        items.push(...historyItems);
      }
      items.push({ role: 'user', content: userMessage });
      currentInput = items;
    }
    let previousResponseId: string | undefined = undefined;

    while (iterations < maxToolIterations) {
      if (modelCalls >= maxModelCalls) {
        const totalDurationMs = Date.now() - startTime;
        this.logger.error(
          `Maximum model calls (${maxModelCalls}) reached for request`,
        );

        await this.observability.recordEvent({
          event: AiEventName.REQUEST_FAILED,
          requestId,
          aiRequestId,
          userId,
          durationMs: totalDurationMs,
          success: false,
          errorCode: AiErrorCode.TIMEOUT,
        });

        throw new ServiceUnavailableException(
          'AI agent exceeded maximum allowed model calls',
        );
      }

      iterations++;
      modelCalls++;
      this.metricsService.increment('ai_tool_iterations');
      const llmStart = Date.now();

      await this.observability.recordEvent({
        event: AiEventName.LLM_STARTED,
        requestId,
        aiRequestId,
        userId,
      });

      let response: OpenAIResponseOutput;
      try {
        response = await this.openAiClient.createRawResponse({
          instructions: FINBUDDY_AGENT_INSTRUCTIONS,
          input: currentInput,
          tools: tools.length > 0 ? tools : undefined,
          previousResponseId,
        });

        await this.observability.recordEvent({
          event: AiEventName.LLM_COMPLETED,
          requestId,
          aiRequestId,
          userId,
          durationMs: Date.now() - llmStart,
          success: true,
        });
      } catch (err) {
        await this.observability.recordEvent({
          event: AiEventName.LLM_FAILED,
          requestId,
          aiRequestId,
          userId,
          durationMs: Date.now() - llmStart,
          success: false,
          errorCode: AiErrorCode.LLM_ERROR,
        });
        throw err;
      }

      if (response.functionCalls.length === 0) {
        const totalDurationMs = Date.now() - startTime;
        this.logger.log(
          `AI request completed: iterations=${iterations}, totalToolCalls=${totalToolCalls}, durationMs=${totalDurationMs}`,
        );

        await this.observability.recordEvent({
          event: AiEventName.REQUEST_COMPLETED,
          requestId,
          aiRequestId,
          userId,
          durationMs: totalDurationMs,
          success: true,
        });

        return new AgentResponse(response.outputText);
      }

      previousResponseId = response.id;
      const toolOutputs: Array<Record<string, unknown>> = [];

      for (const call of response.functionCalls) {
        this.metricsService.increment('ai_tool_calls_total');
        totalToolCalls++;
        const toolStart = Date.now();
        const tool = this.toolRegistry.getTool(call.name);

        await this.observability.recordEvent({
          event: AiEventName.TOOL_REQUESTED,
          requestId,
          aiRequestId,
          userId,
          toolName: call.name,
        });

        let result: AgentToolResult;

        if (!tool) {
          this.logger.warn(`Unknown tool requested by model: ${call.name}`);
          result = {
            success: false,
            error: `Unknown tool: ${call.name}`,
          };

          await this.observability.recordEvent({
            event: AiEventName.TOOL_FAILED,
            requestId,
            aiRequestId,
            userId,
            toolName: call.name,
            durationMs: Date.now() - toolStart,
            success: false,
            errorCode: AiErrorCode.TOOL_NOT_FOUND,
          });
        } else {
          // 1. Tool Argument Validation
          const validationResult = await this.argumentValidator.validate(
            call.name,
            call.arguments,
          );

          if (!validationResult.valid) {
            this.logger.warn(
              `Tool argument validation failed: tool=${call.name}, errors=${validationResult.errors.join('; ')}`,
            );
            result = {
              success: false,
              error: `Invalid tool arguments: ${validationResult.errors.join('; ')}`,
            };

            await this.observability.recordEvent({
              event: AiEventName.TOOL_VALIDATION_FAILED,
              requestId,
              aiRequestId,
              userId,
              toolName: call.name,
              durationMs: Date.now() - toolStart,
              success: false,
              errorCode: AiErrorCode.VALIDATION_ERROR,
              meta: {
                argumentValidation: 'failed',
                argumentCount: Object.keys(call.arguments || {}).length,
                argumentKeys: Object.keys(call.arguments || {}),
              },
            });
          } else {
            // 2. Formal Tool Authorization Check
            const authDecision = this.authorizationService.authorize(
              context.userId,
              tool,
            );

            if (!authDecision.authorized) {
              this.logger.warn(
                `Tool execution denied by policy: tool=${call.name}, userId=${context.userId}, reason=${authDecision.reason}`,
              );
              result = {
                success: false,
                error: `Unauthorized tool execution: ${authDecision.reason}`,
              };

              await this.observability.recordEvent({
                event: AiEventName.TOOL_AUTHORIZATION_DENIED,
                requestId,
                aiRequestId,
                userId,
                toolName: call.name,
                durationMs: Date.now() - toolStart,
                success: false,
                errorCode: AiErrorCode.AUTHORIZATION_ERROR,
                meta: {
                  reasonCode: authDecision.reason,
                },
              });
            } else if (
              !tool.readOnly &&
              (tool.requiresConfirmation ?? tool.name === 'create_transaction')
            ) {
              // 3. Write tool detected: create confirmation & halt tool execution loop
              this.metricsService.increment('ai_confirmation_total');
              const confirmation =
                await this.confirmationService.createConfirmation(
                  context.userId,
                  tool.name,
                  validationResult.value,
                  { requestId, aiRequestId },
                );

              const durationMs = Date.now() - startTime;
              this.logger.log(
                `Financial write proposed, awaiting user confirmation: tool=${tool.name}, confirmationId=${confirmation.id}, durationMs=${durationMs}`,
              );

              return new AgentResponse(
                `Esta operação financeira requer a sua confirmação. Por favor, confira os detalhes abaixo para autorizar ou cancelar.`,
                'confirmation_required',
                {
                  confirmationId: confirmation.id,
                  toolName: tool.name,
                  action: validationResult.value as Record<string, any>,
                  expiresAt: confirmation.expiresAt.toISOString(),
                },
              );
            } else {
              // 4. Read tool execution via Application Service
              await this.observability.recordEvent({
                event: AiEventName.TOOL_STARTED,
                requestId,
                aiRequestId,
                userId,
                toolName: tool.name,
              });

              try {
                result = await tool.execute(context, validationResult.value);
                const toolDurationMs = Date.now() - toolStart;

                if (result.success) {
                  await this.observability.recordEvent({
                    event: AiEventName.TOOL_COMPLETED,
                    requestId,
                    aiRequestId,
                    userId,
                    toolName: tool.name,
                    durationMs: toolDurationMs,
                    success: true,
                  });
                } else {
                  await this.observability.recordEvent({
                    event: AiEventName.TOOL_FAILED,
                    requestId,
                    aiRequestId,
                    userId,
                    toolName: tool.name,
                    durationMs: toolDurationMs,
                    success: false,
                    errorCode: AiErrorCode.TOOL_EXECUTION_ERROR,
                  });
                }
              } catch (err) {
                const toolDurationMs = Date.now() - toolStart;
                this.logger.error(
                  `Tool execution failed: tool=${call.name}`,
                  err instanceof Error ? err.stack : String(err),
                );

                await this.observability.recordEvent({
                  event: AiEventName.TOOL_FAILED,
                  requestId,
                  aiRequestId,
                  userId,
                  toolName: call.name,
                  durationMs: toolDurationMs,
                  success: false,
                  errorCode: AiErrorCode.TOOL_EXECUTION_ERROR,
                });

                result = {
                  success: false,
                  error: 'Failed to execute financial tool',
                };
              }
            }
          }
        }

        toolOutputs.push({
          type: 'function_call_output',
          call_id: call.callId,
          output: JSON.stringify(result),
        });
      }

      currentInput = toolOutputs;
    }

    const totalDurationMs = Date.now() - startTime;
    this.logger.error(
      `Maximum tool iterations (${maxToolIterations}) reached for request`,
    );

    await this.observability.recordEvent({
      event: AiEventName.REQUEST_FAILED,
      requestId,
      aiRequestId,
      userId,
      durationMs: totalDurationMs,
      success: false,
      errorCode: AiErrorCode.TIMEOUT,
    });

    throw new ServiceUnavailableException(
      'AI agent exceeded maximum allowed tool steps',
    );
  }
}
