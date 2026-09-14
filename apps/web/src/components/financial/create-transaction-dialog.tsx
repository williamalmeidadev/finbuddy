"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiAccount, ApiCategory, ApiTransaction } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

interface CreateTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ApiAccount[];
  categories: ApiCategory[];
  onSuccess?: (transaction: ApiTransaction) => void;
}

export function CreateTransactionDialog({
  open,
  onOpenChange,
  accounts,
  categories,
  onSuccess,
}: CreateTransactionDialogProps) {
  const [accountId, setAccountId] = React.useState("");
  const [type, setType] = React.useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [transactionAt, setTransactionAt] = React.useState(
    new Date().toISOString().substring(0, 16)
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      const active = accounts.find((a) => a.isActive);
      if (active) setAccountId(active.id);
    }
  }, [accounts, accountId]);

  const filteredCategories = React.useMemo(() => {
    return categories.filter((c) => c.type === type && c.isActive);
  }, [categories, type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsedAmount = parseFloat(amount);
    if (!accountId || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please select an active account and enter a positive amount.");
      return;
    }

    setIsLoading(true);
    try {
      const transaction = await apiClient<ApiTransaction>("/transactions", {
        method: "POST",
        body: JSON.stringify({
          accountId,
          type,
          amount: parsedAmount,
          description: description.trim() || undefined,
          categoryId: categoryId || undefined,
          transactionAt: new Date(transactionAt).toISOString(),
        }),
      });

      onSuccess?.(transaction);
      onOpenChange(false);
      setAmount("");
      setDescription("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create transaction.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Record New Transaction</DialogTitle>
        <DialogDescription>
          Add an income or expense entry to your account ledger.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Transaction Type</Label>
            <div className="flex rounded-md border p-1 bg-muted/30">
              <button
                type="button"
                className={`flex-1 rounded py-1 text-xs font-semibold transition-colors ${
                  type === "EXPENSE"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setType("EXPENSE");
                  setCategoryId("");
                }}
              >
                Expense
              </button>
              <button
                type="button"
                className={`flex-1 rounded py-1 text-xs font-semibold transition-colors ${
                  type === "INCOME"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setType("INCOME");
                  setCategoryId("");
                }}
              >
                Income
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-amount">Amount</Label>
            <Input
              id="tx-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tx-account">Account</Label>
          <select
            id="tx-account"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
            required
          >
            {accounts
              .filter((a) => a.isActive)
              .map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type}) - Balance: {acc.balance.toFixed(2)}
                </option>
              ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tx-category">Category (Optional)</Label>
          <select
            id="tx-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">-- No Category --</option>
            {filteredCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tx-desc">Description</Label>
          <Input
            id="tx-desc"
            placeholder="e.g. Grocery shopping, Client invoice"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tx-date">Date & Time</Label>
          <Input
            id="tx-date"
            type="datetime-local"
            value={transactionAt}
            onChange={(e) => setTransactionAt(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !amount || !accountId}>
            {isLoading ? "Saving..." : "Record Transaction"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
