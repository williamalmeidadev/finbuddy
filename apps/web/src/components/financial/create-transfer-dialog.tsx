"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiAccount, ApiTransfer } from "@/lib/api/types";
import { AlertCircle, ArrowRightLeft } from "lucide-react";

interface CreateTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accounts: ApiAccount[];
  onSuccess?: (transfer: ApiTransfer) => void;
}

export function CreateTransferDialog({
  open,
  onOpenChange,
  accounts,
  onSuccess,
}: CreateTransferDialogProps) {
  const [fromAccountId, setFromAccountId] = React.useState("");
  const [toAccountId, setToAccountId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [transactionAt, setTransactionAt] = React.useState(
    new Date().toISOString().substring(0, 16)
  );
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const activeAccounts = React.useMemo(
    () => accounts.filter((a) => a.isActive),
    [accounts]
  );

  React.useEffect(() => {
    if (activeAccounts.length >= 2) {
      if (!fromAccountId) setFromAccountId(activeAccounts[0].id);
      if (!toAccountId) setToAccountId(activeAccounts[1].id);
    }
  }, [activeAccounts, fromAccountId, toAccountId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsedAmount = parseFloat(amount);

    if (!fromAccountId || !toAccountId) {
      setErrorMsg("Please select both source and destination accounts.");
      return;
    }
    if (fromAccountId === toAccountId) {
      setErrorMsg("Source and destination accounts must be different.");
      return;
    }
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please enter a positive transfer amount.");
      return;
    }

    setIsLoading(true);
    try {
      const transfer = await apiClient<ApiTransfer>("/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromAccountId,
          toAccountId,
          amount: parsedAmount,
          transactionAt: new Date(transactionAt).toISOString(),
        }),
      });

      onSuccess?.(transfer);
      onOpenChange(false);
      setAmount("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to execute transfer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5 text-primary" />
          <span>Account-to-Account Transfer</span>
        </DialogTitle>
        <DialogDescription>
          Atomically transfer funds between two accounts. Balances will sync instantly.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="from-account">From Account (Source)</Label>
          <select
            id="from-account"
            value={fromAccountId}
            onChange={(e) => setFromAccountId(e.target.value)}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
            required
          >
            {activeAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency} {acc.balance.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="to-account">To Account (Destination)</Label>
          <select
            id="to-account"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
            required
          >
            {activeAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency} {acc.balance.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="tr-amount">Transfer Amount</Label>
            <Input
              id="tr-amount"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tr-date">Date & Time</Label>
            <Input
              id="tr-date"
              type="datetime-local"
              value={transactionAt}
              onChange={(e) => setTransactionAt(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !amount || fromAccountId === toAccountId}>
            {isLoading ? "Transferring..." : "Execute Transfer"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
