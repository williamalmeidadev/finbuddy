"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, RefreshCw, Lock, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ApiAccount, ApiCategory, ApiTransaction } from "@/lib/api/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CreateTransactionDialog } from "@/components/financial/create-transaction-dialog";
import { EditTransactionDialog } from "@/components/financial/edit-transaction-dialog";
import { ConfirmDeleteDialog } from "@/components/financial/confirm-delete-dialog";

export default function TransactionsPage() {
  const [transactions, setTransactions] = React.useState<ApiTransaction[]>([]);
  const [accounts, setAccounts] = React.useState<ApiAccount[]>([]);
  const [categories, setCategories] = React.useState<ApiCategory[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters state
  const [search, setSearch] = React.useState("");
  const [accountId, setAccountId] = React.useState<string>("");
  const [categoryId, setCategoryId] = React.useState<string>("");
  const [type, setType] = React.useState<string>("");
  const [page, setPage] = React.useState(1);
  const limit = 15;

  // Modals state
  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingTx, setEditingTx] = React.useState<ApiTransaction | null>(null);
  const [deletingTx, setDeletingTx] = React.useState<ApiTransaction | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchDependencies = React.useCallback(async () => {
    try {
      const [accs, cats] = await Promise.all([
        apiClient<ApiAccount[]>("/accounts"),
        apiClient<ApiCategory[]>("/categories"),
      ]);
      setAccounts(Array.isArray(accs) ? accs : []);
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err: any) {
      // non-blocking
    }
  }, []);

  const fetchTransactions = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("limit", limit.toString());
      if (search.trim()) params.set("search", search.trim());
      if (accountId) params.set("accountId", accountId);
      if (categoryId) params.set("categoryId", categoryId);
      if (type) params.set("type", type);

      const res = await apiClient<{ data: ApiTransaction[]; total?: number; meta?: { total: number } } | ApiTransaction[]>(
        `/transactions?${params.toString()}`
      );

      if (Array.isArray(res)) {
        setTransactions(res);
        setTotalCount(res.length);
      } else {
        setTransactions(res.data || []);
        setTotalCount(res.total ?? res.meta?.total ?? res.data?.length ?? 0);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, accountId, categoryId, type]);

  React.useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  React.useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleDelete = async () => {
    if (!deletingTx) return;
    setIsDeleting(true);
    try {
      await apiClient(`/transactions/${deletingTx.id}`, { method: "DELETE" });
      setDeletingTx(null);
      fetchTransactions();
    } catch (err: any) {
      setError(err.message || "Failed to delete transaction.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions Ledger</h1>
          <p className="text-sm text-muted-foreground">
            Complete transaction record across all accounts with search and filtering.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTransactions}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setOpenCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Record Transaction
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Filter Controls Bar */}
      <Card className="p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5">
          <div className="relative md:col-span-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search description..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>

          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setPage(1);
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name} ({cat.type})
              </option>
            ))}
          </select>

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income Only</option>
            <option value="EXPENSE">Expense Only</option>
          </select>
        </div>
      </Card>

      {/* Ledger Table Card */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Ledger Entries</CardTitle>
            <span className="text-xs text-muted-foreground">{totalCount} items total</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {transactions.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No transactions match your search or filter parameters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date & Time</th>
                    <th className="px-4 py-3 font-medium">Description</th>
                    <th className="px-4 py-3 font-medium">Account</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium text-right">Amount</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((tx) => {
                    const isImmutable = tx.isSystem || !!tx.transferId;
                    return (
                      <tr key={tx.id} className="hover:bg-muted/30">
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {formatDate(tx.transactionAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              {tx.description || tx.category?.name || "Transaction"}
                            </span>
                            {tx.isSystem && (
                              <Badge variant="secondary" className="text-[10px] gap-1 py-0">
                                <Lock className="h-2.5 w-2.5" />
                                System
                              </Badge>
                            )}
                            {tx.transferId && (
                              <Badge variant="outline" className="text-[10px] gap-1 py-0">
                                <Lock className="h-2.5 w-2.5" />
                                Transfer Linked
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {tx.account?.name || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {tx.category ? (
                            <Badge variant="outline" className="font-normal text-[10px]">
                              {tx.category.name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                            tx.type === "INCOME"
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {tx.type === "INCOME" ? "+" : "-"}
                          {formatCurrency(tx.amount)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => setEditingTx(tx)}
                              title={isImmutable ? "System/Transfer record (View details)" : "Edit transaction"}
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </Button>
                            {!isImmutable && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => setDeletingTx(tx)}
                                title="Delete transaction"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
              className="h-8 gap-1 px-2"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
              className="h-8 gap-1 px-2"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <CreateTransactionDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        accounts={accounts}
        categories={categories}
        onSuccess={() => fetchTransactions()}
      />
      <EditTransactionDialog
        open={!!editingTx}
        onOpenChange={(open) => !open && setEditingTx(null)}
        transaction={editingTx}
        categories={categories}
        onSuccess={() => fetchTransactions()}
      />
      <ConfirmDeleteDialog
        open={!!deletingTx}
        onOpenChange={(open) => !open && setDeletingTx(null)}
        title="Delete Transaction"
        description={`Are you sure you want to delete the transaction of ${deletingTx ? formatCurrency(deletingTx.amount) : ""}? Account balances will be recalculated automatically.`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
