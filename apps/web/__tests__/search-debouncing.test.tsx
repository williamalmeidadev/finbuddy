// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TransactionsPage } from "../src/pages/TransactionsPage";
import { TransfersPage } from "../src/pages/TransfersPage";

// Mock services called by React Query hooks
vi.mock("../src/lib/api/services", () => ({
  transactionService: {
    findAll: vi.fn().mockResolvedValue([
      {
        id: "tx-1",
        description: "Supermarket Purchase",
        amount: 150,
        type: "EXPENSE",
        date: "2026-09-10T10:00:00Z",
        account: { id: "acc-1", name: "Checking Account" },
        category: { id: "cat-1", name: "Groceries" },
      },
      {
        id: "tx-2",
        description: "Salary Deposit",
        amount: 3000,
        type: "INCOME",
        date: "2026-09-01T10:00:00Z",
        account: { id: "acc-2", name: "Savings Account" },
        category: { id: "cat-2", name: "Income" },
      },
    ]),
  },
  accountService: {
    findAll: vi.fn().mockResolvedValue([
      { id: "acc-1", name: "Checking Account" },
      { id: "acc-2", name: "Savings Account" },
    ]),
  },
  categoryService: {
    findAll: vi.fn().mockResolvedValue([
      { id: "cat-1", name: "Groceries" },
      { id: "cat-2", name: "Income" },
    ]),
  },
  transferService: {
    findAll: vi.fn().mockResolvedValue([
      {
        id: "tr-1",
        description: "Emergency Fund Transfer",
        amount: 500,
        date: "2026-09-05T10:00:00Z",
        fromAccountId: "acc-1",
        toAccountId: "acc-2",
        fromAccount: { id: "acc-1", name: "Checking Account" },
        toAccount: { id: "acc-2", name: "Savings Account" },
      },
      {
        id: "tr-2",
        description: "Investment Allocation",
        amount: 1000,
        date: "2026-09-06T10:00:00Z",
        fromAccountId: "acc-2",
        toAccountId: "acc-1",
        fromAccount: { id: "acc-2", name: "Savings Account" },
        toAccount: { id: "acc-1", name: "Checking Account" },
      },
    ]),
  },
}));

function renderWithClient(component: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{component}</QueryClientProvider>
  );
}

describe("Search Debouncing in Pages", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("TransactionsPage filters items only after debounce delay", async () => {
    renderWithClient(<TransactionsPage />);

    // Wait for initial data load using real timers
    const item1 = await screen.findByText("Supermarket Purchase");
    const item2 = await screen.findByText("Salary Deposit");
    expect(item1).toBeTruthy();
    expect(item2).toBeTruthy();

    // Enable fake timers after initial load to test debounce delay precisely
    vi.useFakeTimers();

    const input = screen.getByPlaceholderText("Buscar por descrição, conta ou categoria...");
    fireEvent.change(input, { target: { value: "Supermarket" } });

    // Before debounce timer fires, both items are still visible
    expect(screen.getByText("Salary Deposit")).toBeTruthy();

    // Advance timer past debounce delay (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // After debounce, only matching item is visible
    expect(screen.getByText("Supermarket Purchase")).toBeTruthy();
    expect(screen.queryByText("Salary Deposit")).toBeNull();
  });

  it("TransfersPage filters items only after debounce delay", async () => {
    renderWithClient(<TransfersPage />);

    // Wait for initial data load using real timers
    const item1 = await screen.findByText("Emergency Fund Transfer");
    const item2 = await screen.findByText("Investment Allocation");
    expect(item1).toBeTruthy();
    expect(item2).toBeTruthy();

    // Enable fake timers after initial load to test debounce delay precisely
    vi.useFakeTimers();

    const input = screen.getByPlaceholderText("Buscar por descrição ou conta...");
    fireEvent.change(input, { target: { value: "Emergency" } });

    // Before debounce timer fires, both items are still visible
    expect(screen.getByText("Investment Allocation")).toBeTruthy();

    // Advance timer past debounce delay (300ms)
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // After debounce, only matching item is visible
    expect(screen.getByText("Emergency Fund Transfer")).toBeTruthy();
    expect(screen.queryByText("Investment Allocation")).toBeNull();
  });
});
