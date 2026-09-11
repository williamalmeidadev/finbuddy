import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OpenAIClient } from '../infrastructure/openai/openai.client';
import { AgentToolRegistryService } from './tools/agent-tool-registry.service';
import { AgentToolAuthorizationService } from './authorization/agent-tool-authorization.service';
import { AgentToolArgumentValidatorService } from './validation/agent-tool-argument-validator.service';
import { FINBUDDY_AGENT_INSTRUCTIONS } from './prompts/finbuddy-agent.instructions';
import { AgentResponse } from '../domain/agent-response';
import {
  AgentToolContext,
  AgentToolResult,
} from './tools/agent-tool.interface';
import { MetricsService } from '../../common/metrics/metrics.service';

@Injectable()
export class AiAgentOrchestratorService {
  private readonly logger = new Logger(AiAgentOrchestratorService.name);
  private readonly MAX_TOOL_ITERATIONS = 5;

  constructor(
    private readonly openAiClient: OpenAIClient,
    private readonly toolRegistry: AgentToolRegistryService,
    private readonly authorizationService: AgentToolAuthorizationService,
    private readonly argumentValidator: AgentToolArgumentValidatorService,
    private readonly metricsService: MetricsService,
  ) {}

  async processUserMessage(
    userId: string,
    userMessage: string,
  ): Promise<AgentResponse> {
    const startTime = Date.now();
    const tools = this.toolRegistry.getToolDefinitions();
    const context: AgentToolContext = { userId };

    let iterations = 0;
    let totalToolCalls = 0;
    let currentInput: string | any[] = userMessage;
    let previousResponseId: string | undefined = undefined;

    while (iterations < this.MAX_TOOL_ITERATIONS) {
      iterations++;

      const response = await this.openAiClient.createRawResponse({
        instructions: FINBUDDY_AGENT_INSTRUCTIONS,
        input: currentInput,
        tools: tools.length > 0 ? tools : undefined,
        previousResponseId,
      });

      if (response.functionCalls.length === 0) {
        const totalDurationMs = Date.now() - startTime;
        this.logger.log(
          `AI request completed: iterations=${iterations}, totalToolCalls=${totalToolCalls}, durationMs=${totalDurationMs}`,
        );
        this.metricsService.increment('ai_requests_total');
        this.metricsService.increment('ai_requests_success_total');
        return new AgentResponse(response.outputText);
      }

      previousResponseId = response.id;
      const toolOutputs: any[] = [];

      for (const call of response.functionCalls) {
        totalToolCalls++;
        this.metricsService.increment('ai_tool_calls_total');
        const toolStart = Date.now();
        const tool = this.toolRegistry.getTool(call.name);

        let result: AgentToolResult;

        if (!tool) {
          this.logger.warn(`Unknown tool requested by model: ${call.name}`);
          this.metricsService.increment('ai_tool_failures_total');
          result = {
            success: false,
            error: `Unknown tool: ${call.name}`,
          };
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
            this.metricsService.increment('ai_tool_failures_total');
            result = {
              success: false,
              error: `Invalid tool arguments: ${validationResult.errors.join('; ')}`,
            };
          } else {
            // 2. Formal Tool Authorization Check
            const authDecision = this.authorizationService.authorize(
              context.userId,
              tool,
              validationResult.value,
            );

            if (!authDecision.authorized) {
              this.logger.warn(
                `Tool execution denied by policy: tool=${call.name}, userId=${context.userId}, reason=${authDecision.reason}`,
              );
              this.metricsService.increment('ai_tool_failures_total');
              result = {
                success: false,
                error: `Unauthorized tool execution: ${authDecision.reason}`,
              };
            } else {
              // 3. Execution via Application Service
              try {
                result = await tool.execute(context, validationResult.value);
                if (!result.success) {
                  this.metricsService.increment('ai_tool_failures_total');
                }
              } catch (err) {
                this.logger.error(
                  `Tool execution failed: tool=${call.name}`,
                  err instanceof Error ? err.stack : String(err),
                );
                this.metricsService.increment('ai_tool_failures_total');
                result = {
                  success: false,
                  error: 'Failed to execute financial tool',
                };
              }
            }
          }
        }

        const toolDurationMs = Date.now() - toolStart;
        this.logger.log(
          `Tool executed: toolName=${call.name}, success=${result.success}, durationMs=${toolDurationMs}`,
        );

        toolOutputs.push({
          type: 'function_call_output',
          call_id: call.callId,
          output: JSON.stringify(result),
        });
      }

      currentInput = toolOutputs;
    }

    this.logger.error(
      `Maximum tool iterations (${this.MAX_TOOL_ITERATIONS}) reached for request`,
    );
    this.metricsService.increment('ai_tool_max_iterations_reached_total');
    throw new ServiceUnavailableException(
      'AI agent exceeded maximum allowed tool steps',
    );
  }
}
