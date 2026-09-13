"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiTransfer } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

interface EditTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transfer: ApiTransfer | null;
  onSuccess?: (transfer: ApiTransfer) => void;
}

export function EditTransferDialog({
  open,
  onOpenChange,
  transfer,
  onSuccess,
}: EditTransferDialogProps) {
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [transferredAt, setTransferredAt] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (transfer) {
      setAmount(transfer.amount.toString());
      setDescription(transfer.description || "");
      const dateVal = transfer.transferredAt || transfer.transactionAt || transfer.createdAt;
      setTransferredAt(
        new Date(dateVal).toISOString().substring(0, 16)
      );
      setErrorMsg(null);
    }
  }, [transfer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transfer) return;
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Transfer amount must be positive.");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await apiClient<ApiTransfer>(`/transfers/${transfer.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          amount: parsedAmount,
          description: description.trim() || undefined,
          transferredAt: new Date(transferredAt).toISOString(),
        }),
      });

      onSuccess?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update transfer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit Transfer</DialogTitle>
        <DialogDescription>
          Modify transfer amount or description. Account balances will adjust automatically.
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
          <Label htmlFor="edit-tr-amount">Amount</Label>
          <Input
            id="edit-tr-amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-tr-desc">Description</Label>
          <Input
            id="edit-tr-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-tr-date">Transfer Date & Time</Label>
          <Input
            id="edit-tr-date"
            type="datetime-local"
            value={transferredAt}
            onChange={(e) => setTransferredAt(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !amount}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
