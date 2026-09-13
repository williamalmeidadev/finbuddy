import { Injectable } from '@nestjs/common';
import { AiMemoryType } from '../../../generated/prisma/enums';

export interface MemoryValidationResult {
  valid: boolean;
  errorCode?: string;
  reason?: string;
  sanitizedValue?: string;
}

const ALLOWED_KEYS_BY_TYPE: Record<AiMemoryType, string[]> = {
  [AiMemoryType.PREFERENCE]: [
    'preferred_currency',
    'preferred_language',
    'preferred_date_format',
    'preferred_summary_period',
  ],
  [AiMemoryType.FINANCIAL_GOAL]: [
    'monthly_savings_target',
    'emergency_fund_target',
    'spending_limit_goal',
  ],
  [AiMemoryType.GENERAL_CONTEXT]: ['budgeting_style'],
};

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous\s+)?(rules|instructions)/i,
  /system\s*(instruction|:)/i,
  /call\s+create_transaction/i,
  /confirmed\s*=\s*true/i,
  /you\s+are\s+now\s+an?\s+admin/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /<script/i,
];

@Injectable()
export class AiMemoryPolicyService {
  public readonly MAX_MEMORIES_PER_USER = 20;
  public readonly MAX_MEMORY_VALUE_LENGTH = 500;

  isAllowedType(type: string): type is AiMemoryType {
    return Object.values(AiMemoryType).includes(type as AiMemoryType);
  }

  isAllowedKey(type: AiMemoryType, key: string): boolean {
    const allowed = ALLOWED_KEYS_BY_TYPE[type];
    return allowed ? allowed.includes(key) : false;
  }

  validate(type: string, key: string, value: unknown): MemoryValidationResult {
    if (!this.isAllowedType(type)) {
      return {
        valid: false,
        errorCode: 'INVALID_MEMORY_TYPE',
        reason: `Memory type '${type}' is not recognized or permitted`,
      };
    }

    const memoryType = type;

    if (!this.isAllowedKey(memoryType, key)) {
      return {
        valid: false,
        errorCode: 'INVALID_MEMORY_KEY',
        reason: `Memory key '${key}' is not allowed for type '${type}'`,
      };
    }

    if (typeof value !== 'string') {
      return {
        valid: false,
        errorCode: 'INVALID_MEMORY_VALUE',
        reason: 'Memory value must be a string',
      };
    }

    const trimmedValue = value.trim();

    if (trimmedValue.length === 0) {
      return {
        valid: false,
        errorCode: 'INVALID_MEMORY_VALUE',
        reason: 'Memory value cannot be empty',
      };
    }

    if (trimmedValue.length > this.MAX_MEMORY_VALUE_LENGTH) {
      return {
        valid: false,
        errorCode: 'INVALID_MEMORY_VALUE',
        reason: `Memory value exceeds maximum length of ${this.MAX_MEMORY_VALUE_LENGTH} characters`,
      };
    }

    // Check for prompt injection / malicious instruction payloads
    for (const pattern of PROMPT_INJECTION_PATTERNS) {
      if (pattern.test(trimmedValue)) {
        return {
          valid: false,
          errorCode: 'INVALID_MEMORY_VALUE',
          reason: 'Memory value contains forbidden instruction patterns',
        };
      }
    }

    // Specific key-level validation
    const keyValidation = this.validateValueForKey(key, trimmedValue);
    if (!keyValidation.valid) {
      return keyValidation;
    }

    return {
      valid: true,
      sanitizedValue: keyValidation.sanitizedValue ?? trimmedValue,
    };
  }

  private validateValueForKey(
    key: string,
    value: string,
  ): MemoryValidationResult {
    switch (key) {
      case 'preferred_currency': {
        const uppercase = value.toUpperCase();
        if (!/^[A-Z]{3}$/.test(uppercase)) {
          return {
            valid: false,
            errorCode: 'INVALID_MEMORY_VALUE',
            reason:
              'preferred_currency must be a valid 3-letter ISO 4217 code (e.g. BRL, USD, EUR)',
          };
        }
        return { valid: true, sanitizedValue: uppercase };
      }

      case 'preferred_language': {
        if (!/^[a-z]{2}(-[A-Z]{2})?$/i.test(value)) {
          return {
            valid: false,
            errorCode: 'INVALID_MEMORY_VALUE',
            reason:
              'preferred_language must be a valid locale code (e.g. pt-BR, en-US, es-ES)',
          };
        }
        return { valid: true, sanitizedValue: value };
      }

      case 'preferred_date_format': {
        const allowedFormats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
        if (!allowedFormats.includes(value)) {
          return {
            valid: false,
            errorCode: 'INVALID_MEMORY_VALUE',
            reason: `preferred_date_format must be one of: ${allowedFormats.join(', ')}`,
          };
        }
        return { valid: true, sanitizedValue: value };
      }

      case 'preferred_summary_period': {
        const allowedPeriods = ['monthly', 'weekly', 'yearly'];
        if (!allowedPeriods.includes(value.toLowerCase())) {
          return {
            valid: false,
            errorCode: 'INVALID_MEMORY_VALUE',
            reason: `preferred_summary_period must be one of: ${allowedPeriods.join(', ')}`,
          };
        }
        return { valid: true, sanitizedValue: value.toLowerCase() };
      }

      case 'monthly_savings_target':
      case 'emergency_fund_target':
      case 'spending_limit_goal': {
        const num = Number(value);
        if (isNaN(num) || num <= 0 || !/^\d+(\.\d{1,4})?$/.test(value)) {
          return {
            valid: false,
            errorCode: 'INVALID_MEMORY_VALUE',
            reason: `${key} must be a positive monetary decimal number`,
          };
        }
        return { valid: true, sanitizedValue: value };
      }

      case 'budgeting_style': {
        const allowedStyles = ['monthly', 'zero_based', '50_30_20', 'envelope'];
        if (!allowedStyles.includes(value.toLowerCase())) {
          return {
            valid: false,
            errorCode: 'INVALID_MEMORY_VALUE',
            reason: `budgeting_style must be one of: ${allowedStyles.join(', ')}`,
          };
        }
        return { valid: true, sanitizedValue: value.toLowerCase() };
      }

      default:
        return { valid: true, sanitizedValue: value };
    }
  }
}
