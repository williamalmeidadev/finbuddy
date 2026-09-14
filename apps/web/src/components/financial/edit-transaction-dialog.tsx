"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiCategory, ApiTransaction } from "@/lib/api/types";
import { AlertCircle, Lock } from "lucide-react";

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: ApiTransaction | null;
  categories: ApiCategory[];
  onSuccess?: (transaction: ApiTransaction) => void;
}

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
  categories,
  onSuccess,
}: EditTransactionDialogProps) {
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [transactionAt, setTransactionAt] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (transaction) {
      setAmount(transaction.amount.toString());
      setDescription(transaction.description || "");
      setCategoryId(transaction.categoryId || "");
      setTransactionAt(
        new Date(transaction.transactionAt).toISOString().substring(0, 16)
      );
      setErrorMsg(null);
    }
  }, [transaction]);

  const isReadOnly = React.useMemo(() => {
    if (!transaction) return false;
    return transaction.isSystem || !!transaction.transferId;
  }, [transaction]);

  const filteredCategories = React.useMemo(() => {
    if (!transaction) return categories;
    return categories.filter((c) => c.type === transaction.type && c.isActive);
  }, [categories, transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction || isReadOnly) return;
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Amount must be a positive number.");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await apiClient<ApiTransaction>(`/transactions/${transaction.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: parsedAmount,
          description: description.trim() || undefined,
          categoryId: categoryId || undefined,
          transactionAt: new Date(transactionAt).toISOString(),
        }),
      });

      onSuccess?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update transaction.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit Transaction</DialogTitle>
        <DialogDescription>
          Modify transaction details in your ledger.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {isReadOnly && (
          <div className="flex items-center gap-2 rounded-md bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
            <Lock className="h-4 w-4 shrink-0" />
            <span>
              This transaction is {transaction?.isSystem ? "a System record" : "linked to a Transfer"} and cannot be edited directly. Edit the transfer directly instead.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="edit-tx-amount">Amount</Label>
          <Input
            id="edit-tx-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading || isReadOnly}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-tx-cat">Category</Label>
          <select
            id="edit-tx-cat"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isLoading || isReadOnly}
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
          <Label htmlFor="edit-tx-desc">Description</Label>
          <Input
            id="edit-tx-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading || isReadOnly}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-tx-date">Date & Time</Label>
          <Input
            id="edit-tx-date"
            type="datetime-local"
            value={transactionAt}
            onChange={(e) => setTransactionAt(e.target.value)}
            disabled={isLoading || isReadOnly}
            required
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {isReadOnly ? "Close" : "Cancel"}
          </Button>
          {!isReadOnly && (
            <Button type="submit" disabled={isLoading || !amount}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </form>
    </Dialog>
  );
}
