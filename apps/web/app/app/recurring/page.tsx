"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, RefreshCw, Calendar, Repeat } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ApiAccount, ApiCategory, ApiRecurringTransaction } from "@/lib/api/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CreateRecurringDialog } from "@/components/financial/create-recurring-dialog";
import { EditRecurringDialog } from "@/components/financial/edit-recurring-dialog";
import { ConfirmDeleteDialog } from "@/components/financial/confirm-delete-dialog";

export default function RecurringPage() {
  const [recurringTxs, setRecurringTxs] = React.useState<ApiRecurringTransaction[]>([]);
  const [accounts, setAccounts] = React.useState<ApiAccount[]>([]);
  const [categories, setCategories] = React.useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingRecurring, setEditingRecurring] = React.useState<ApiRecurringTransaction | null>(null);
  const [deletingRecurring, setDeletingRecurring] = React.useState<ApiRecurringTransaction | null>(null);
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

  const fetchRecurring = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<ApiRecurringTransaction[]>("/recurring-transactions");
      setRecurringTxs(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load recurring transactions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  React.useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const handleDelete = async () => {
    if (!deletingRecurring) return;
    setIsDeleting(true);
    try {
      await apiClient(`/recurring-transactions/${deletingRecurring.id}`, { method: "DELETE" });
      setDeletingRecurring(null);
      fetchRecurring();
    } catch (err: any) {
      setError(err.message || "Failed to delete recurring rule.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleActive = async (rec: ApiRecurringTransaction) => {
    try {
      await apiClient(`/recurring-transactions/${rec.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: !rec.isActive }),
      });
      fetchRecurring();
    } catch (err: any) {
      setError(err.message || "Failed to update status.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Recurring Schedules</h1>
          <p className="text-sm text-muted-foreground">
            Manage automated subscriptions, salary schedules, and periodic transaction rules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchRecurring}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setOpenCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Schedule
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Rules List */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Active Schedules</CardTitle>
            <Badge variant="outline">{recurringTxs.length} Rules</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {recurringTxs.length === 0 && !isLoading ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              No recurring transactions scheduled yet. Click &quot;New Schedule&quot; to add one.
            </Card>
          ) : (
            <div className="divide-y text-sm">
              {recurringTxs.map((rec) => (
                <div
                  key={rec.id}
                  className={`flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center hover:bg-muted/30 ${
                    !rec.isActive ? "opacity-60" : ""
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {rec.description || rec.category?.name || "Recurring Item"}
                      </span>
                      <Badge variant="secondary" className="text-[10px] uppercase">
                        {rec.frequency}
                      </Badge>
                      <Badge
                        variant={rec.isActive ? "default" : "outline"}
                        className="text-[10px] cursor-pointer"
                        onClick={() => handleToggleActive(rec)}
                      >
                        {rec.isActive ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Account: {rec.account?.name || "Account"} • Category: {rec.category?.name || "None"}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Next Due: {formatDate(rec.nextDueDate)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span
                      className={`text-base font-bold ${
                        rec.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {rec.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(rec.amount)}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingRecurring(rec)}
                        title="Edit Schedule"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeletingRecurring(rec)}
                        title="Delete Schedule"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateRecurringDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        accounts={accounts}
        categories={categories}
        onSuccess={() => fetchRecurring()}
      />
      <EditRecurringDialog
        open={!!editingRecurring}
        onOpenChange={(open) => !open && setEditingRecurring(null)}
        recurring={editingRecurring}
        categories={categories}
        onSuccess={() => fetchRecurring()}
      />
      <ConfirmDeleteDialog
        open={!!deletingRecurring}
        onOpenChange={(open) => !open && setDeletingRecurring(null)}
        title="Delete Recurring Schedule"
        description={`Are you sure you want to delete the recurring schedule for "${deletingRecurring?.description || deletingRecurring?.category?.name || "this item"}"?`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
