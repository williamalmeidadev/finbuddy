"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, RefreshCw, ArrowRight, ArrowLeftRight } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ApiAccount, ApiTransfer } from "@/lib/api/types";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { CreateTransferDialog } from "@/components/financial/create-transfer-dialog";
import { EditTransferDialog } from "@/components/financial/edit-transfer-dialog";
import { ConfirmDeleteDialog } from "@/components/financial/confirm-delete-dialog";

export default function TransfersPage() {
  const [transfers, setTransfers] = React.useState<ApiTransfer[]>([]);
  const [accounts, setAccounts] = React.useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingTransfer, setEditingTransfer] = React.useState<ApiTransfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = React.useState<ApiTransfer | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchDependencies = React.useCallback(async () => {
    try {
      const accs = await apiClient<ApiAccount[]>("/accounts");
      setAccounts(Array.isArray(accs) ? accs : []);
    } catch (err: any) {
      // non-blocking
    }
  }, []);

  const fetchTransfers = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<ApiTransfer[]>("/transfers");
      setTransfers(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load transfers.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDependencies();
  }, [fetchDependencies]);

  React.useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleDelete = async () => {
    if (!deletingTransfer) return;
    setIsDeleting(true);
    try {
      await apiClient(`/transfers/${deletingTransfer.id}`, { method: "DELETE" });
      setDeletingTransfer(null);
      fetchTransfers();
    } catch (err: any) {
      setError(err.message || "Failed to delete transfer.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inter-Account Transfers</h1>
          <p className="text-sm text-muted-foreground">
            Track and manage atomic movements between checking, savings, and credit accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchTransfers}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setOpenCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Transfer
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Transfers List Card */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Transfer History</CardTitle>
            <Badge variant="outline">{transfers.length} Transfers</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {transfers.length === 0 && !isLoading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No transfers recorded yet. Click &quot;New Transfer&quot; to make your first account transfer.
            </div>
          ) : (
            <div className="divide-y text-sm">
              {transfers.map((tr) => (
                <div
                  key={tr.id}
                  className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center hover:bg-muted/30"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {tr.sourceAccount?.name || "Source Account"}
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold text-foreground">
                        {tr.destinationAccount?.name || "Target Account"}
                      </span>
                    </div>
                    {tr.description && (
                      <p className="text-xs text-muted-foreground">{tr.description}</p>
                    )}
                    <p className="text-[11px] text-muted-foreground">
                      Transferred on {formatDate(tr.transferredAt || tr.transactionAt || tr.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:justify-end">
                    <span className="text-base font-bold text-foreground">
                      {formatCurrency(tr.amount)}
                    </span>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditingTransfer(tr)}
                        title="Edit Transfer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => setDeletingTransfer(tr)}
                        title="Delete Transfer (Reverses Balances)"
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
      <CreateTransferDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        accounts={accounts}
        onSuccess={() => fetchTransfers()}
      />
      <EditTransferDialog
        open={!!editingTransfer}
        onOpenChange={(open) => !open && setEditingTransfer(null)}
        transfer={editingTransfer}
        onSuccess={() => fetchTransfers()}
      />
      <ConfirmDeleteDialog
        open={!!deletingTransfer}
        onOpenChange={(open) => !open && setDeletingTransfer(null)}
        title="Delete & Reverse Transfer"
        description={`Are you sure you want to delete this ${deletingTransfer ? formatCurrency(deletingTransfer.amount) : ""} transfer? Source account balance will be restored and target account balance reduced.`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
