import { apiClient } from "./client";
import {
  AuthResponse,
  ApiUser,
  ApiAccount,
  CreateAccountDto,
  UpdateAccountDto,
  ApiTransaction,
  CreateTransactionDto,
  UpdateTransactionDto,
  ApiTransfer,
  CreateTransferDto,
  UpdateTransferDto,
  ApiCategory,
  CreateCategoryDto,
  UpdateCategoryDto,
  ApiBudget,
  CreateBudgetDto,
  UpdateBudgetDto,
  ApiRecurringTransaction,
  CreateRecurringTransactionDto,
  UpdateRecurringTransactionDto,
  ApiFinancialSummary,
  ApiAgentResponse,
  ApiAgentConfirmation,
} from "./types";

// --- AUTH SERVICE ---
export const authService = {
  login: (email: string, password: string): Promise<AuthResponse> =>
    apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      requiresAuth: false,
    }),

  register: (name: string, email: string, password: string): Promise<ApiUser> =>
    apiClient<ApiUser>("/users", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
      requiresAuth: false,
    }),

  me: (): Promise<ApiUser> => apiClient<ApiUser>("/auth/me"),

  refresh: (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> =>
    apiClient<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      requiresAuth: false,
    }),

  logout: (refreshToken: string): Promise<{ message: string }> =>
    apiClient<{ message: string }>("/auth/logout", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
      requiresAuth: true,
    }),
};

// --- ACCOUNTS SERVICE ---
export const accountService = {
  findAll: (): Promise<ApiAccount[]> => apiClient<ApiAccount[]>("/accounts"),
  findOne: (id: string): Promise<ApiAccount> => apiClient<ApiAccount>(`/accounts/${id}`),
  create: (dto: CreateAccountDto): Promise<ApiAccount> =>
    apiClient<ApiAccount>("/accounts", {
      method: "POST",
      body: JSON.stringify({
        currency: "BRL",
        color: "#820AD1",
        ...dto,
      }),
    }),
  update: (id: string, dto: UpdateAccountDto): Promise<ApiAccount> =>
    apiClient<ApiAccount>(`/accounts/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  delete: (id: string): Promise<ApiAccount> =>
    apiClient<ApiAccount>(`/accounts/${id}`, {
      method: "DELETE",
    }),
};

// --- TRANSACTIONS SERVICE ---
export const transactionService = {
  findAll: (query?: Record<string, string>): Promise<ApiTransaction[]> => {
    const params = new URLSearchParams(query || {}).toString();
    return apiClient<ApiTransaction[]>(`/transactions${params ? `?${params}` : ""}`);
  },
  findOne: (id: string): Promise<ApiTransaction> =>
    apiClient<ApiTransaction>(`/transactions/${id}`),
  create: (dto: CreateTransactionDto): Promise<ApiTransaction> =>
    apiClient<ApiTransaction>("/transactions", {
      method: "POST",
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateTransactionDto): Promise<ApiTransaction> =>
    apiClient<ApiTransaction>(`/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  delete: (id: string): Promise<ApiTransaction> =>
    apiClient<ApiTransaction>(`/transactions/${id}`, {
      method: "DELETE",
    }),
};

// --- TRANSFERS SERVICE ---
export const transferService = {
  findAll: (): Promise<ApiTransfer[]> => apiClient<ApiTransfer[]>("/transfers"),
  findOne: (id: string): Promise<ApiTransfer> => apiClient<ApiTransfer>(`/transfers/${id}`),
  create: (dto: CreateTransferDto): Promise<ApiTransfer> =>
    apiClient<ApiTransfer>("/transfers", {
      method: "POST",
      body: JSON.stringify({
        fromAccountId: dto.fromAccountId,
        toAccountId: dto.toAccountId,
        amount: dto.amount,
        transactionAt: dto.transactionAt || new Date().toISOString(),
      }),
    }),
  update: (id: string, dto: UpdateTransferDto): Promise<ApiTransfer> =>
    apiClient<ApiTransfer>(`/transfers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  delete: (id: string): Promise<ApiTransfer> =>
    apiClient<ApiTransfer>(`/transfers/${id}`, {
      method: "DELETE",
    }),
};

// --- CATEGORIES SERVICE ---
export const categoryService = {
  findAll: (): Promise<ApiCategory[]> => apiClient<ApiCategory[]>("/categories"),
  findOne: (id: string): Promise<ApiCategory> => apiClient<ApiCategory>(`/categories/${id}`),
  create: (dto: CreateCategoryDto): Promise<ApiCategory> =>
    apiClient<ApiCategory>("/categories", {
      method: "POST",
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateCategoryDto): Promise<ApiCategory> =>
    apiClient<ApiCategory>(`/categories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  deactivate: (id: string): Promise<ApiCategory> =>
    apiClient<ApiCategory>(`/categories/${id}`, {
      method: "DELETE",
    }),
};

// --- BUDGETS SERVICE ---
export const budgetService = {
  findAll: (monthStr?: string, categoryId?: string): Promise<ApiBudget[]> => {
    const params = new URLSearchParams();
    if (monthStr) params.append("month", monthStr);
    if (categoryId) params.append("categoryId", categoryId);
    const queryStr = params.toString();
    return apiClient<ApiBudget[]>(`/budgets${queryStr ? `?${queryStr}` : ""}`);
  },
  findOne: (id: string): Promise<ApiBudget> => apiClient<ApiBudget>(`/budgets/${id}`),
  create: (dto: CreateBudgetDto): Promise<ApiBudget> =>
    apiClient<ApiBudget>("/budgets", {
      method: "POST",
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateBudgetDto): Promise<ApiBudget> =>
    apiClient<ApiBudget>(`/budgets/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  delete: (id: string): Promise<ApiBudget> =>
    apiClient<ApiBudget>(`/budgets/${id}`, {
      method: "DELETE",
    }),
};

// --- RECURRING TRANSACTIONS SERVICE ---
export const recurringService = {
  findAll: (): Promise<ApiRecurringTransaction[]> =>
    apiClient<ApiRecurringTransaction[]>("/recurring-transactions"),
  findOne: (id: string): Promise<ApiRecurringTransaction> =>
    apiClient<ApiRecurringTransaction>(`/recurring-transactions/${id}`),
  create: (dto: CreateRecurringTransactionDto): Promise<ApiRecurringTransaction> =>
    apiClient<ApiRecurringTransaction>("/recurring-transactions", {
      method: "POST",
      body: JSON.stringify(dto),
    }),
  update: (id: string, dto: UpdateRecurringTransactionDto): Promise<ApiRecurringTransaction> =>
    apiClient<ApiRecurringTransaction>(`/recurring-transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    }),
  delete: (id: string): Promise<ApiRecurringTransaction> =>
    apiClient<ApiRecurringTransaction>(`/recurring-transactions/${id}`, {
      method: "DELETE",
    }),
};

// --- FINANCIAL SUMMARY SERVICE ---
export const financialSummaryService = {
  getSummary: (month?: string): Promise<ApiFinancialSummary> => {
    const params = month ? `?month=${encodeURIComponent(month)}` : "";
    return apiClient<ApiFinancialSummary>(`/financial-summary${params}`);
  },
};

// --- AI SERVICE ---
export interface ConversationItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  confirmation?: ApiAgentConfirmation & { status?: string };
}

export const aiService = {
  sendMessage: (message: string, conversationId?: string): Promise<ApiAgentResponse> =>
    apiClient<ApiAgentResponse>("/ai-agent/messages", {
      method: "POST",
      body: JSON.stringify({ message, conversationId }),
    }),

  listConversations: (page = 1, limit = 20): Promise<{ items: ConversationItem[]; data?: ConversationItem[]; total: number }> =>
    apiClient<{ items: ConversationItem[]; data?: ConversationItem[]; total: number }>(
      `/ai-agent/conversations?page=${page}&limit=${limit}`
    ),

  createConversation: (title?: string): Promise<ConversationItem> =>
    apiClient<ConversationItem>("/ai-agent/conversations", {
      method: "POST",
      body: JSON.stringify({ title }),
    }),

  getConversationMessages: (
    conversationId: string,
    page = 1,
    limit = 50
  ): Promise<{ items: ConversationMessage[]; data?: ConversationMessage[]; total: number }> =>
    apiClient<{ items: ConversationMessage[]; data?: ConversationMessage[]; total: number }>(
      `/ai-agent/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
    ),

  deleteConversation: (conversationId: string): Promise<{ success: boolean; message: string }> =>
    apiClient<{ success: boolean; message: string }>(
      `/ai-agent/conversations/${conversationId}`,
      { method: "DELETE" }
    ),

  confirmAction: (confirmationId: string, conversationId?: string): Promise<{ success: boolean; message: string }> =>
    apiClient<{ success: boolean; message: string }>(
      `/ai-agent/confirmations/${confirmationId}`,
      {
        method: "POST",
        body: conversationId ? JSON.stringify({ conversationId }) : undefined,
      }
    ),

  cancelAction: (confirmationId: string, conversationId?: string): Promise<{ success: boolean; message: string }> =>
    apiClient<{ success: boolean; message: string }>(
      `/ai-agent/confirmations/${confirmationId}/cancel`,
      {
        method: "POST",
        body: conversationId ? JSON.stringify({ conversationId }) : undefined,
      }
    ),

  listMemories: (): Promise<Array<{ id: string; key: string; value: string }>> =>
    apiClient<Array<{ id: string; key: string; value: string }>>("/ai-agent/memories"),

  deleteMemory: (memoryId: string): Promise<{ success: boolean; message: string }> =>
    apiClient<{ success: boolean; message: string }>(`/ai-agent/memories/${memoryId}`, {
      method: "DELETE",
    }),
};
