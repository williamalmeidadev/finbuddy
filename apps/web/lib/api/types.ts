/**
 * FinBuddy API Contract Definitions
 *
 * Typed interface definitions matching backend NestJS API DTO response contracts.
 */

export interface ApiResponse<T = unknown> {
  data?: T;
  message?: string;
  statusCode?: number;
}

export interface ApiUser {
  id: string;
  email: string;
  name?: string;
  role?: string;
  status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: ApiUser;
}

export interface ApiAccount {
  id: string;
  userId: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH";
  balance: number;
  currency: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountDto {
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH";
  balance?: number;
  currency?: string;
}

export interface UpdateAccountDto {
  name?: string;
  type?: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH";
  currency?: string;
}

export interface ApiTransaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string | null;
  transferId?: string | null;
  amount: number;
  type: "INCOME" | "EXPENSE";
  source?: "MANUAL" | "SYSTEM" | "IMPORT";
  isSystem?: boolean;
  description?: string | null;
  transactionAt: string;
  createdAt: string;
  updatedAt: string;
  account?: { name: string; type?: string };
  category?: { name: string; type?: string };
}

export interface CreateTransactionDto {
  accountId: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  description?: string;
  transactionAt: string;
  categoryId?: string;
}

export interface UpdateTransactionDto {
  amount?: number;
  description?: string;
  type?: "INCOME" | "EXPENSE";
  categoryId?: string;
  accountId?: string;
  transactionAt?: string;
}

export interface ApiTransfer {
  id: string;
  userId: string;
  fromAccountId?: string;
  toAccountId?: string;
  sourceAccountId?: string;
  destinationAccountId?: string;
  amount: number;
  transferredAt?: string;
  transactionAt?: string;
  description?: string | null;
  createdAt: string;
  sourceAccount?: { name: string };
  destinationAccount?: { name: string };
  fromAccount?: { name: string };
  toAccount?: { name: string };
}

export interface CreateTransferDto {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transferredAt?: string;
  description?: string;
}

export interface UpdateTransferDto {
  amount?: number;
  transferredAt?: string;
  description?: string;
}

export interface ApiCategory {
  id: string;
  userId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon?: string | null;
  color?: string | null;
  isSystem?: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryDto {
  name: string;
  type: "INCOME" | "EXPENSE";
  icon?: string;
  color?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  icon?: string;
  color?: string;
}

export interface ApiBudget {
  id: string;
  userId: string;
  categoryId: string;
  month: number | string;
  year?: number;
  amount: number;
  spent?: number;
  spentAmount?: number;
  remaining?: number;
  percentageUsed?: number;
  createdAt: string;
  updatedAt: string;
  category?: { name: string; type?: string; color?: string };
}

export interface CreateBudgetDto {
  categoryId: string;
  month: number;
  year: number;
  amount: number;
}

export interface UpdateBudgetDto {
  amount?: number;
}

export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface ApiRecurringTransaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string | null;
  amount: number;
  type: "INCOME" | "EXPENSE";
  frequency: RecurrenceFrequency;
  interval?: number;
  description?: string | null;
  startDate?: string;
  nextDueDate: string;
  nextOccurrence?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  account?: { name: string };
  category?: { name: string };
}

export interface CreateRecurringTransactionDto {
  accountId: string;
  type: "INCOME" | "EXPENSE";
  amount: number;
  frequency: RecurrenceFrequency;
  interval?: number;
  description?: string;
  nextDueDate: string;
  categoryId?: string;
}

export interface UpdateRecurringTransactionDto {
  amount?: number;
  description?: string;
  frequency?: RecurrenceFrequency;
  interval?: number;
  nextDueDate?: string;
  categoryId?: string;
  isActive?: boolean;
}

export interface ApiFinancialSummary {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  netSavings: number;
  savingsRate?: number;
  month?: string;
  accountBalances?: Array<{
    accountId: string;
    accountName: string;
    accountType: string;
    balance: number;
  }>;
  categoryBreakdown?: Array<{
    categoryId: string;
    categoryName: string;
    type: "INCOME" | "EXPENSE";
    amount: number;
    percentage: number;
  }>;
}

export interface ApiAgentConfirmation {
  id: string;
  tool: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  parameters: Record<string, unknown>;
  expiresAt: string;
}

export interface ApiAgentResponse {
  type: "response" | "confirmation_required";
  message: string;
  conversationId?: string;
  confirmation?: ApiAgentConfirmation;
}
