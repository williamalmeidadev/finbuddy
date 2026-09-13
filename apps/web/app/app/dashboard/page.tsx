"use client";

import * as React from "react";
import { BalanceCard } from "@/components/financial/balance-card";
import { AccountCard } from "@/components/financial/account-card";
import { DollarSign, ArrowUpRight, ArrowDownRight, Wallet, Plus, ArrowLeftRight, CreditCard, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/lib/api/client";
import { ApiAccount, ApiBudget, ApiCategory, ApiFinancialSummary, ApiTransaction } from "@/lib/api/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CreateTransactionDialog } from "@/components/financial/create-transaction-dialog";
import { CreateTransferDialog } from "@/components/financial/create-transfer-dialog";
import { CreateAccountDialog } from "@/components/financial/create-account-dialog";

export default function DashboardPage() {
  const [summary, setSummary] = React.useState<ApiFinancialSummary | null>(null);
  const [accounts, setAccounts] = React.useState<ApiAccount[]>([]);
  const [transactions, setTransactions] = React.useState<ApiTransaction[]>([]);
  const [budgets, setBudgets] = React.useState<ApiBudget[]>([]);
  const [categories, setCategories] = React.useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog state
  const [openTxModal, setOpenTxModal] = React.useState(false);
  const [openTransferModal, setOpenTransferModal] = React.useState(false);
  const [openAccModal, setOpenAccModal] = React.useState(false);

  const fetchData = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [sumData, accsData, txsData, bdgData, catData] = await Promise.all([
        apiClient<ApiFinancialSummary>("/financial-summary"),
        apiClient<ApiAccount[]>("/accounts"),
        apiClient<{ data: ApiTransaction[] } | ApiTransaction[]>("/transactions?limit=5"),
        apiClient<ApiBudget[]>("/budgets"),
        apiClient<ApiCategory[]>("/categories"),
      ]);

      setSummary(sumData);
      setAccounts(Array.isArray(accsData) ? accsData : []);
      
      const rawTxs = Array.isArray(txsData) ? txsData : (txsData as any).data || [];
      setTransactions(rawTxs.slice(0, 5));
      setBudgets(Array.isArray(bdgData) ? bdgData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err: any) {
      setError(err.message || "Failed to load financial dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeAccountsCount = accounts.filter((a) => a.isActive).length;

  return (
    <div className="space-y-6">
      {/* Top Title & Actions Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-sm text-muted-foreground">
            Real-time balance, account breakdown, and budget health.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setOpenTxModal(true)}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            New Transaction
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setOpenTransferModal(true)}
            className="gap-1.5"
          >
            <ArrowLeftRight className="h-4 w-4" />
            Transfer
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpenAccModal(true)}
            className="gap-1.5"
          >
            <CreditCard className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Overview Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard
          title="Total Net Worth"
          amount={summary ? summary.totalBalance : 0}
          icon={DollarSign}
          description="Across all connected accounts"
        />
        <BalanceCard
          title="Monthly Income"
          amount={summary ? summary.monthlyIncome : 0}
          icon={ArrowUpRight}
          description="Current calendar month"
        />
        <BalanceCard
          title="Monthly Expenses"
          amount={summary ? -Math.abs(summary.monthlyExpenses) : 0}
          icon={ArrowDownRight}
          description="Current calendar month"
        />
        <BalanceCard
          title="Net Savings"
          amount={summary ? summary.netSavings : 0}
          icon={Wallet}
          description="Income minus expenses"
        />
      </div>

      {/* Connected Accounts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Financial Accounts</h2>
          <Badge variant="outline">{activeAccountsCount} Active</Badge>
        </div>

        {accounts.length === 0 && !isLoading ? (
          <Card className="p-6 text-center text-muted-foreground">
            No accounts found. Click &quot;Add Account&quot; to get started.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {accounts.map((acc) => (
              <AccountCard
                key={acc.id}
                id={acc.id}
                name={acc.name}
                type={acc.type}
                balance={acc.balance}
                currency={acc.currency}
              />
            ))}
          </div>
        )}
      </div>

      {/* Two Column Layout: Recent Transactions & Active Budgets */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Ledger Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Recent Transactions</CardTitle>
              <CardDescription>Latest entries recorded in your account ledger.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 && !isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No recent transactions found.
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {transactions.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3.5 text-sm">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {tx.description || tx.category?.name || "Transaction"}
                        </span>
                        {tx.category && (
                          <Badge variant="outline" className="text-[10px]">
                            {tx.category.name}
                          </Badge>
                        )}
                        {tx.isSystem && (
                          <Badge variant="secondary" className="text-[10px]">
                            System
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {tx.account?.name || "Account"} • {formatDate(tx.transactionAt)}
                      </div>
                    </div>
                    <div
                      className={`font-semibold ${
                        tx.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget Health Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Monthly Budgets</CardTitle>
            <CardDescription>Spend progress vs limits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {budgets.length === 0 && !isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No active category budgets set.
              </div>
            ) : (
              budgets.map((b) => {
                const spent = b.spentAmount ?? 0;
                const limit = b.amount;
                const pct = Math.min(100, Math.round((spent / limit) * 100)) || 0;
                const isExceeded = spent > limit;
                const isWarning = spent > limit * 0.8 && !isExceeded;

                let badgeVariant: "default" | "secondary" | "destructive" = "default";
                let statusLabel = "Healthy";
                if (isExceeded) {
                  badgeVariant = "destructive";
                  statusLabel = "Exceeded";
                } else if (isWarning) {
                  badgeVariant = "secondary";
                  statusLabel = "Warning";
                }

                return (
                  <div key={b.id} className="space-y-1.5 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium">{b.category?.name || "Category"}</span>
                      <Badge variant={badgeVariant} className="text-[10px] py-0 px-1.5">
                        {statusLabel} ({pct}%)
                      </Badge>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full transition-all ${
                          isExceeded
                            ? "bg-destructive"
                            : isWarning
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>{formatCurrency(spent)} spent</span>
                      <span>Limit: {formatCurrency(limit)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Creation Dialogs */}
      <CreateTransactionDialog
        open={openTxModal}
        onOpenChange={setOpenTxModal}
        accounts={accounts}
        categories={categories}
        onSuccess={() => fetchData()}
      />
      <CreateTransferDialog
        open={openTransferModal}
        onOpenChange={setOpenTransferModal}
        accounts={accounts}
        onSuccess={() => fetchData()}
      />
      <CreateAccountDialog
        open={openAccModal}
        onOpenChange={setOpenAccModal}
        onSuccess={() => fetchData()}
      />
    </div>
  );
}
