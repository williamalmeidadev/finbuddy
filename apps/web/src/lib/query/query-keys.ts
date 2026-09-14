export const queryKeys = {
  accounts: {
    all: ["accounts"] as const,
    lists: () => [...queryKeys.accounts.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.accounts.lists(), filters || {}] as const,
    details: () => [...queryKeys.accounts.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.accounts.details(), id] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    lists: () => [...queryKeys.transactions.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.transactions.lists(), filters || {}] as const,
    details: () => [...queryKeys.transactions.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.transactions.details(), id] as const,
  },
  transfers: {
    all: ["transfers"] as const,
    lists: () => [...queryKeys.transfers.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.transfers.lists(), filters || {}] as const,
    details: () => [...queryKeys.transfers.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.transfers.details(), id] as const,
  },
  categories: {
    all: ["categories"] as const,
    lists: () => [...queryKeys.categories.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.categories.lists(), filters || {}] as const,
    details: () => [...queryKeys.categories.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.categories.details(), id] as const,
  },
  budgets: {
    all: ["budgets"] as const,
    lists: () => [...queryKeys.budgets.all, "list"] as const,
    list: (month?: string, categoryId?: string) => [...queryKeys.budgets.lists(), { month, categoryId }] as const,
    details: () => [...queryKeys.budgets.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.budgets.details(), id] as const,
  },
  recurringTransactions: {
    all: ["recurringTransactions"] as const,
    lists: () => [...queryKeys.recurringTransactions.all, "list"] as const,
    list: (filters?: Record<string, any>) => [...queryKeys.recurringTransactions.lists(), filters || {}] as const,
    details: () => [...queryKeys.recurringTransactions.all, "detail"] as const,
    detail: (id: string) => [...queryKeys.recurringTransactions.details(), id] as const,
  },
  financialSummary: {
    all: ["financialSummary"] as const,
    month: (monthStr?: string) => [...queryKeys.financialSummary.all, monthStr || "current"] as const,
  },
  profile: {
    all: ["profile"] as const,
  },
  ai: {
    all: ["ai"] as const,
    conversations: (page = 1, limit = 20) => [...queryKeys.ai.all, "conversations", { page, limit }] as const,
    conversation: (id: string) => [...queryKeys.ai.all, "conversation", id] as const,
    messages: (conversationId: string, page = 1, limit = 50) => [...queryKeys.ai.all, "messages", conversationId, { page, limit }] as const,
    memories: () => [...queryKeys.ai.all, "memories"] as const,
  },
};
