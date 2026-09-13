"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, RefreshCw, Landmark, CreditCard, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ApiAccount } from "@/lib/api/types";
import { formatCurrency } from "@/lib/formatters";
import { CreateAccountDialog } from "@/components/financial/create-account-dialog";
import { EditAccountDialog } from "@/components/financial/edit-account-dialog";
import { ConfirmDeleteDialog } from "@/components/financial/confirm-delete-dialog";

export default function AccountsPage() {
  const [accounts, setAccounts] = React.useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<ApiAccount | null>(null);
  const [deletingAccount, setDeletingAccount] = React.useState<ApiAccount | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchAccounts = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<ApiAccount[]>("/accounts");
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load accounts.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleDelete = async () => {
    if (!deletingAccount) return;
    setIsDeleting(true);
    try {
      await apiClient(`/accounts/${deletingAccount.id}`, { method: "DELETE" });
      setDeletingAccount(null);
      fetchAccounts();
    } catch (err: any) {
      setError(err.message || "Failed to deactivate account.");
    } finally {
      setIsDeleting(false);
    }
  };

  const getAccountIcon = (type: ApiAccount["type"]) => {
    switch (type) {
      case "CHECKING": return Landmark;
      case "SAVINGS": return PiggyBank;
      case "CREDIT_CARD": return CreditCard;
      case "INVESTMENT": return TrendingUp;
      case "CASH": return Wallet;
      default: return Landmark;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounts Management</h1>
          <p className="text-sm text-muted-foreground">
            View and manage connected bank accounts, savings, credit cards, and investments.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchAccounts}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setOpenCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Account
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {accounts.length === 0 && !isLoading ? (
        <Card className="p-8 text-center text-muted-foreground">
          No financial accounts configured yet. Click &quot;Add Account&quot; to get started.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => {
            const IconComponent = getAccountIcon(acc.type);
            return (
              <Card key={acc.id} className={`relative overflow-hidden transition-all ${!acc.isActive ? "opacity-60" : ""}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-primary/10 p-2 text-primary">
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">{acc.name}</CardTitle>
                      <div className="text-xs text-muted-foreground uppercase">{acc.type}</div>
                    </div>
                  </div>
                  <Badge variant={acc.isActive ? "default" : "secondary"}>
                    {acc.isActive ? "Active" : "Inactive"}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground">Current Balance</span>
                    <span className={`text-xl font-bold ${acc.balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
                      {formatCurrency(acc.balance, acc.currency)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 text-xs"
                      onClick={() => setEditingAccount(acc)}
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    {acc.isActive && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeletingAccount(acc)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Deactivate
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialogs */}
      <CreateAccountDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={() => fetchAccounts()}
      />
      <EditAccountDialog
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        account={editingAccount}
        onSuccess={() => fetchAccounts()}
      />
      <ConfirmDeleteDialog
        open={!!deletingAccount}
        onOpenChange={(open) => !open && setDeletingAccount(null)}
        title="Deactivate Financial Account"
        description={`Are you sure you want to deactivate "${deletingAccount?.name}"? Its historical transaction record will be preserved.`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
