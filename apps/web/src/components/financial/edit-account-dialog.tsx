"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiAccount } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

interface EditAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: ApiAccount | null;
  onSuccess?: (account: ApiAccount) => void;
}

export function EditAccountDialog({
  open,
  onOpenChange,
  account,
  onSuccess,
}: EditAccountDialogProps) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ApiAccount["type"]>("CHECKING");
  const [currency, setCurrency] = React.useState("BRL");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (account) {
      setName(account.name);
      setType(account.type);
      setCurrency(account.currency);
      setErrorMsg(null);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    setErrorMsg(null);

    setIsLoading(true);
    try {
      const updated = await apiClient<ApiAccount>(`/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim() || undefined,
          type,
          currency,
        }),
      });

      onSuccess?.(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit Account</DialogTitle>
        <DialogDescription>
          Update the name, classification, or currency of your account.
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
          <Label htmlFor="edit-acc-name">Account Name</Label>
          <Input
            id="edit-acc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-acc-type">Account Type</Label>
          <select
            id="edit-acc-type"
            value={type}
            onChange={(e) => setType(e.target.value as ApiAccount["type"])}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="CHECKING">Checking Account</option>
            <option value="SAVINGS">Savings Account</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="INVESTMENT">Investment Account</option>
            <option value="CASH">Cash Wallet</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-acc-currency">Currency</Label>
          <Input
            id="edit-acc-currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value.toUpperCase())}
            disabled={isLoading}
            maxLength={3}
            required
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
