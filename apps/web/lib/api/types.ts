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
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken?: string;
  user: ApiUser;
}

export interface ApiAccount {
  id: string;
  userId: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH";
  balance: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTransaction {
  id: string;
  userId: string;
  accountId: string;
  categoryId?: string | null;
  transferId?: string | null;
  amount: number;
  type: "INCOME" | "EXPENSE";
  source: "MANUAL" | "SYSTEM" | "IMPORT";
  description?: string | null;
  transactionAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTransfer {
  id: string;
  userId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  transactionAt: string;
  createdAt: string;
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
