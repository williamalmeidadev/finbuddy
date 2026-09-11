import { Injectable, Logger } from '@nestjs/common';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  GetAccountsArgsDto,
  GetBudgetsArgsDto,
  GetFinancialSummaryArgsDto,
  GetTransactionsArgsDto,
} from './tool-argument.dtos';

export interface ToolValidationResult {
  valid: boolean;
  errors: string[];
  value?: unknown;
}

@Injectable()
export class AgentToolArgumentValidatorService {
  private readonly logger = new Logger(AgentToolArgumentValidatorService.name);

  private readonly toolDtoMap: Record<string, ClassConstructor<object>> = {
    get_accounts: GetAccountsArgsDto,
    get_transactions: GetTransactionsArgsDto,
    get_financial_summary: GetFinancialSummaryArgsDto,
    get_budgets: GetBudgetsArgsDto,
  };

  async validate(
    toolName: string,
    rawArguments: unknown,
  ): Promise<ToolValidationResult> {
    let parsed: unknown = rawArguments;

    if (typeof rawArguments === 'string') {
      try {
        parsed = JSON.parse(rawArguments) as unknown;
      } catch {
        this.logger.warn(`Failed to parse tool JSON arguments for ${toolName}`);
        return {
          valid: false,
          errors: ['Tool arguments must be a valid JSON object'],
        };
      }
    }

    if (
      parsed === null ||
      parsed === undefined ||
      typeof parsed !== 'object' ||
      Array.isArray(parsed)
    ) {
      return {
        valid: false,
        errors: ['Tool arguments must be a non-null JSON object'],
      };
    }

    const objectParsed = parsed as Record<string, unknown>;

    if (toolName === 'get_accounts') {
      const keys = Object.keys(objectParsed);
      if (keys.length > 0) {
        this.logger.warn(
          `Unexpected properties on get_accounts arguments: ${keys.join(', ')}`,
        );
        return {
          valid: false,
          errors: [
            `Unexpected property passed to get_accounts: ${keys.join(', ')}`,
          ],
        };
      }
      return {
        valid: true,
        errors: [],
        value: {},
      };
    }

    const DtoClass = this.toolDtoMap[toolName];
    if (!DtoClass) {
      return {
        valid: false,
        errors: [`No validation schema registered for tool: ${toolName}`],
      };
    }

    const instance = plainToInstance(DtoClass, objectParsed);
    const errors = await validate(instance, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      const messages: string[] = [];
      for (const err of errors) {
        if (err.constraints) {
          messages.push(...Object.values(err.constraints));
        }
      }
      this.logger.warn(
        `Tool argument validation failed for ${toolName}: ${messages.join('; ')}`,
      );
      return {
        valid: false,
        errors: messages.length > 0 ? messages : ['Invalid tool arguments'],
      };
    }

    return {
      valid: true,
      errors: [],
      value: instance,
    };
  }
}
