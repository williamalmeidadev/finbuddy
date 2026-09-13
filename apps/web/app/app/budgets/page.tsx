"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, RefreshCw, PieChart, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ApiBudget, ApiCategory } from "@/lib/api/types";
import { formatCurrency } from "@/lib/formatters";
import { CreateBudgetDialog } from "@/components/financial/create-budget-dialog";
import { EditBudgetDialog } from "@/components/financial/edit-budget-dialog";
import { ConfirmDeleteDialog } from "@/components/financial/confirm-delete-dialog";

export default function BudgetsPage() {
  const [budgets, setBudgets] = React.useState<ApiBudget[]>([]);
  const [categories, setCategories] = React.useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Month & Year selector state
  const [month, setMonth] = React.useState(new Date().getMonth() + 1);
  const [year, setYear] = React.useState(new Date().getFullYear());

  // Dialog states
  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<ApiBudget | null>(null);
  const [deletingBudget, setDeletingBudget] = React.useState<ApiBudget | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchDependencies = React.useCallback(async () => {
    try {
      const cats = await apiClient<ApiCategory[]>("/categories");
      setCategories(Array.isArray(cats) ? cats : []);
    } catch (err: any) {
      // non-blocking
    }
  }, []);

  const fetchBudgets = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<ApiBudget[]>(`/budgets?month=${month}&year=${year}`);
      setBudgets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load budgets.");
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  React.useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  React.useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleDelete = async () => {
    if (!deletingBudget) return;
    setIsDeleting(true);
    try {
      await apiClient(`/budgets/${deletingBudget.id}`, { method: "DELETE" });
      setDeletingBudget(null);
      fetchBudgets();
    } catch (err: any) {
      setError(err.message || "Failed to delete budget limit.");
    } finally {
      setIsDeleting(false);
    }
  };

  const totalBudgeted = budgets.reduce((acc, b) => acc + b.amount, 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spentAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Category Budgets</h1>
          <p className="text-sm text-muted-foreground">
            Set and monitor monthly spending limits for expense categories.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm outline-none focus:ring-1 focus:ring-ring"
          >
            {[
              "January", "February", "March", "April", "May", "June",
              "July", "August", "September", "October", "November", "December"
            ].map((mName, i) => (
              <option key={i + 1} value={i + 1}>
                {mName}
              </option>
            ))}
          </select>
          <Input
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-9 w-20 text-xs font-mono"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={fetchBudgets}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setOpenCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Set Budget
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Monthly Budgeted</CardDescription>
            <CardTitle className="text-2xl font-bold">{formatCurrency(totalBudgeted)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Actual Spent</CardDescription>
            <CardTitle className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(totalSpent)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Spending Ratio</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0}%
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Budget Grid */}
      {budgets.length === 0 && !isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">
          No budget limits set for this period. Click &quot;Set Budget&quot; to create a category budget.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const spent = b.spentAmount ?? 0;
            const limit = b.amount;
            const pct = Math.min(100, Math.round((spent / limit) * 100)) || 0;
            const remaining = limit - spent;
            const isExceeded = spent > limit;
            const isWarning = spent > limit * 0.8 && !isExceeded;

            let badgeVariant: "default" | "secondary" | "destructive" = "default";
            let statusLabel = "Healthy";
            let StatusIcon = CheckCircle2;

            if (isExceeded) {
              badgeVariant = "destructive";
              statusLabel = "Exceeded";
              StatusIcon = AlertCircle;
            } else if (isWarning) {
              badgeVariant = "secondary";
              statusLabel = "Warning";
              StatusIcon = AlertTriangle;
            }

            return (
              <Card key={b.id} className="space-y-4 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: b.category?.color || "#3b82f6" }}
                    />
                    <span className="font-semibold">{b.category?.name || "Category"}</span>
                  </div>
                  <Badge variant={badgeVariant} className="gap-1 text-[11px]">
                    <StatusIcon className="h-3 w-3" />
                    {statusLabel}
                  </Badge>
                </div>

                <div className="space-y-1.5">
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
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
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-muted-foreground">{pct}% spent</span>
                    <span className="font-semibold">
                      {formatCurrency(spent)} / {formatCurrency(limit)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t pt-3 text-xs">
                  <span className={remaining < 0 ? "text-rose-600 font-semibold" : "text-muted-foreground"}>
                    {remaining < 0
                      ? `${formatCurrency(Math.abs(remaining))} over`
                      : `${formatCurrency(remaining)} left`}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => setEditingBudget(b)}
                      title="Edit Limit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setDeletingBudget(b)}
                      title="Delete Budget"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateBudgetDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        categories={categories}
        onSuccess={() => fetchBudgets()}
      />
      <EditBudgetDialog
        open={!!editingBudget}
        onOpenChange={(open) => !open && setEditingBudget(null)}
        budget={editingBudget}
        onSuccess={() => fetchBudgets()}
      />
      <ConfirmDeleteDialog
        open={!!deletingBudget}
        onOpenChange={(open) => !open && setDeletingBudget(null)}
        title="Delete Budget Limit"
        description={`Are you sure you want to delete the budget limit for "${deletingBudget?.category?.name}"?`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
