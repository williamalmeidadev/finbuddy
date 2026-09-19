import { Injectable, Logger } from '@nestjs/common';

export interface GuardrailCheckResult {
  allowed: boolean;
  reason?: 'PROGRAMMING_ATTEMPT' | 'OFF_TOPIC' | 'PROMPT_INJECTION';
  refusalMessage?: string;
}

@Injectable()
export class AgentDomainGuardrailService {
  private readonly logger = new Logger(AgentDomainGuardrailService.name);

  private static readonly DEFAULT_REFUSAL_MESSAGE =
    'Sou o FinBuddy, seu assistente focado exclusivamente em finanças pessoais. Não posso ajudar com assuntos fora do escopo financeiro (como programação, tecnologia geral, receitas ou tarefas não relacionadas a finanças). Como posso te ajudar com suas contas, transações, orçamentos ou planejamento financeiro hoje?';

  // Allowed financial context exceptions where words like "código" are valid
  private static readonly FINANCIAL_EXCEPTIONS = [
    /\bcódigo\s+de\s+barras\b/i,
    /\bcódigo\s+pix\b/i,
    /\bcódigo\s+(?:do\s+)?banco\b/i,
    /\bcódigo\s+bancário\b/i,
    /\bcódigo\s+swift\b/i,
    /\bcódigo\s+iban\b/i,
    /\bcódigo\s+(?:de\s+)?segurança\b/i,
    /\bcódigo\s+(?:de\s+)?verificação\b/i,
    /\bcódigo\s+(?:de\s+)?autenticação\b/i,
  ];

  // Financial action phrases / entities
  private static readonly FINANCIAL_INTENTS = [
    /\b(?:transfer|transferência|transação|transaction|orçamento|budget|despesa|expense|receita|income|conta|account|saldo|balance|categoria|category|extrato|pagamento|payment|cartão|card|banco|bank)\b/i,
    /\b(?:transferir|depositar|sacar|pagar|cobrar|investir|poupar|guardar)\b/i,
    /\b(?:reais|R\$|\$|USD|EUR|BRL)\b/i,
  ];

  // Patterns indicating software development / programming / code generation
  private static readonly PROGRAMMING_PATTERNS = [
    // Direct code / programming intent phrases
    /\b(?:escreva|crie|faça|gerar|desenvolva|construa)\s+(?:um\s+)?(?:código|script|algoritmo|função|programa|projeto|componente)\b/i,
    /\b(?:ajuda|ajude|me\s+ajude)\s+com\s+(?:programação|código|desenvolvimento|script|algoritmo|debug)\b/i,
    /\b(?:como\s+)?(?:programar|codar|debugar|compilar)\b/i,
    /\bcode\s+(?:snippet|in|for|example|script)\b/i,
    /\bwrite\s+(?:a\s+)?(?:code|function|script|algorithm|program)\b/i,
    /\bdebug\s+(?:this|este)?\s*(?:code|código|script|function|error)\b/i,
    /\b(?:código|script|função|algoritmo|programa)\s+(?:em|in|for)\s+(?:python|javascript|typescript|react|node|html|css|c\+\+|cpp|csharp|golang|php|ruby|rust|swift|kotlin)\b/i,

    // Specific programming language syntax or keywords
    /\b(?:python|javascript|typescript|react|node\.?js|html|css|java|c\+\+|cpp|csharp|golang|php|ruby|rust|kotlin|dockerfile|bash|powershell)\b/i,
    /\b(?:console\.log|print\(|def\s+\w+\(|function\s+\w+\(|import\s+React|public\s+static\s+void|select\s+\*\s+from|create\s+table|drop\s+table|insert\s+into|npm\s+install|git\s+commit)\b/i,
  ];

  // Patterns indicating prompt injection / jailbreak attempts targeting system rules
  private static readonly PROMPT_INJECTION_PATTERNS = [
    /\b(?:override|bypass)\s+(?:system\s+)?(?:rules|guardrails|prompt|instructions)\b/i,
    /\b(?:you\s+are\s+now|act\s+as)\s+(?:DAN|developer\s+mode|jailbreak|unrestricted)\b/i,
    /\b(?:print|show|display|reveal)\s+(?:your\s+)?(?:system\s+prompt|instructions|developer\s+rules)\b/i,
    /\bquais\s+são\s+suas\s+instruções\s+de\s+sistema\b/i,
  ];

  // Patterns indicating general non-financial off-topic requests (recipes, trivia, etc.)
  private static readonly GENERAL_OFF_TOPIC_PATTERNS = [
    /\b(?:receita\s+de|como\s+fazer\s+(?:um\s+)?bolo|ingredientes\s+para\s+bolo)\b/i,
    /\b(?:escreva\s+um\s+poema|conte\s+uma\s+piada|escreva\s+uma\s+história)\b/i,
  ];

  validateInput(message: string): GuardrailCheckResult {
    if (!message || typeof message !== 'string') {
      return { allowed: true };
    }

    const trimmed = message.trim();

    // Check financial exceptions first (e.g. "código de barras", "código pix")
    const isFinancialException =
      AgentDomainGuardrailService.FINANCIAL_EXCEPTIONS.some((regex) =>
        regex.test(trimmed),
      );

    // 1. Check prompt injection / jailbreak attempts (if NOT asking for financial operations)
    const isFinancialIntent = AgentDomainGuardrailService.FINANCIAL_INTENTS.some(
      (regex) => regex.test(trimmed),
    );

    const isPromptInjection =
      AgentDomainGuardrailService.PROMPT_INJECTION_PATTERNS.some((regex) =>
        regex.test(trimmed),
      );

    if (isPromptInjection && !isFinancialIntent) {
      this.logger.warn(
        `Guardrail intercepted prompt injection attempt: "${trimmed.slice(0, 50)}..."`,
      );
      return {
        allowed: false,
        reason: 'PROMPT_INJECTION',
        refusalMessage: AgentDomainGuardrailService.DEFAULT_REFUSAL_MESSAGE,
      };
    }

    // 2. Check programming / software development attempts (unless matching financial exception)
    if (!isFinancialException) {
      const isProgramming =
        AgentDomainGuardrailService.PROGRAMMING_PATTERNS.some((regex) =>
          regex.test(trimmed),
        );
      if (isProgramming) {
        this.logger.warn(
          `Guardrail intercepted off-topic programming request: "${trimmed.slice(0, 50)}..."`,
        );
        return {
          allowed: false,
          reason: 'PROGRAMMING_ATTEMPT',
          refusalMessage: AgentDomainGuardrailService.DEFAULT_REFUSAL_MESSAGE,
        };
      }
    }

    // 3. Check general off-topic requests
    const isOffTopic =
      AgentDomainGuardrailService.GENERAL_OFF_TOPIC_PATTERNS.some((regex) =>
        regex.test(trimmed),
      );
    if (isOffTopic) {
      this.logger.warn(
        `Guardrail intercepted general off-topic request: "${trimmed.slice(0, 50)}..."`,
      );
      return {
        allowed: false,
        reason: 'OFF_TOPIC',
        refusalMessage: AgentDomainGuardrailService.DEFAULT_REFUSAL_MESSAGE,
      };
    }

    return { allowed: true };
  }
}

