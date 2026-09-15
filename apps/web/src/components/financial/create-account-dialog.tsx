"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "@/components/ui/color-picker";
import { apiClient } from "@/lib/api/client";
import { ApiAccount } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

interface CreateAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (account: ApiAccount) => void;
}

export function CreateAccountDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateAccountDialogProps) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<ApiAccount["type"]>("CHECKING");
  const [balance, setBalance] = React.useState("0");
  const [currency, setCurrency] = React.useState("BRL");
  const [color, setColor] = React.useState("#38bdf8");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const account = await apiClient<ApiAccount>("/accounts", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type,
          balance: parseFloat(balance) || 0,
          currency,
          color,
        }),
      });

      onSuccess?.(account);
      onOpenChange(false);
      setName("");
      setBalance("0");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Add Financial Account</DialogTitle>
        <DialogDescription>
          Create a new checking, savings, investment, or credit card account.
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
          <Label htmlFor="acc-name">Account Name</Label>
          <Input
            id="acc-name"
            placeholder="e.g. Main Checking, Emergency Reserve"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="acc-type">Account Type</Label>
          <select
            id="acc-type"
            value={type}
            onChange={(e) => setType(e.target.value as ApiAccount["type"])}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="CHECKING">Checking Account</option>
            <option value="SAVINGS">Savings Account</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="INVESTMENT">Investment Account</option>
            <option value="CASH">Cash Wallet</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="acc-balance">Initial Balance</Label>
            <Input
              id="acc-balance"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="acc-currency">Currency</Label>
            <Input
              id="acc-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              disabled={isLoading}
              maxLength={3}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Account Color Accent</Label>
          <ColorPicker value={color} onChange={setColor} disabled={isLoading} />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? "Creating..." : "Create Account"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
