// @vitest-environment jsdom
import React from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAccounts, useTransactions, useFinancialSummary, useCategories, useDeleteConversation } from "../src/lib/queries";
import { accountService, transactionService, financialSummaryService, categoryService, aiService } from "../src/lib/api/services";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../src/lib/api/services", () => ({
  accountService: {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  transactionService: {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  financialSummaryService: {
    getSummary: vi.fn(),
  },
  categoryService: {
    findAll: vi.fn(),
  },
  aiService: {
    deleteConversation: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("TanStack Query Domain Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("useAccounts should fetch accounts data via accountService", async () => {
    const mockAccounts = [{ id: "acc-1", name: "Bank Account", balance: 1000, type: "CHECKING", currency: "BRL", isActive: true }];
    vi.mocked(accountService.findAll).mockResolvedValue(mockAccounts as any);

    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAccounts);
    expect(accountService.findAll).toHaveBeenCalledTimes(1);
  });

  it("useTransactions should fetch transactions with filters", async () => {
    const mockTx = [{ id: "tx-1", amount: 50, type: "EXPENSE" }];
    vi.mocked(transactionService.findAll).mockResolvedValue(mockTx as any);

    const { result } = renderHook(() => useTransactions({ type: "EXPENSE" }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockTx);
    expect(transactionService.findAll).toHaveBeenCalledWith({ type: "EXPENSE" });
  });

  it("useFinancialSummary should fetch monthly summary", async () => {
    const mockSummary = { totalBalance: 5000, monthlyIncome: 2000, monthlyExpenses: 500, netSavings: 1500 };
    vi.mocked(financialSummaryService.getSummary).mockResolvedValue(mockSummary as any);

    const { result } = renderHook(() => useFinancialSummary("2026-09"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockSummary);
    expect(financialSummaryService.getSummary).toHaveBeenCalledWith("2026-09");
  });

  it("useDeleteConversation should call aiService.deleteConversation", async () => {
    vi.mocked(aiService.deleteConversation).mockResolvedValue({ success: true, message: "Deleted" } as any);

    const { result } = renderHook(() => useDeleteConversation(), { wrapper: createWrapper() });

    await result.current.mutateAsync("conv-123");

    expect(aiService.deleteConversation).toHaveBeenCalledWith("conv-123");
  });
});
