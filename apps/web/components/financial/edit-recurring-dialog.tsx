"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiCategory, ApiRecurringTransaction } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

interface EditRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurring: ApiRecurringTransaction | null;
  categories: ApiCategory[];
  onSuccess?: (recurring: ApiRecurringTransaction) => void;
}

export function EditRecurringDialog({
  open,
  onOpenChange,
  recurring,
  categories,
  onSuccess,
}: EditRecurringDialogProps) {
  const [amount, setAmount] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [frequency, setFrequency] = React.useState<"DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [nextDueDate, setNextDueDate] = React.useState("");
  const [isActive, setIsActive] = React.useState(true);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (recurring) {
      setAmount(recurring.amount.toString());
      setDescription(recurring.description || "");
      setCategoryId(recurring.categoryId || "");
      setFrequency(recurring.frequency);
      setNextDueDate(
        new Date(recurring.nextDueDate).toISOString().substring(0, 10)
      );
      setIsActive(recurring.isActive);
      setErrorMsg(null);
    }
  }, [recurring]);

  const filteredCategories = React.useMemo(() => {
    if (!recurring) return categories;
    return categories.filter((c) => c.type === recurring.type && c.isActive);
  }, [categories, recurring]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recurring) return;
    setErrorMsg(null);

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Amount must be a positive number.");
      return;
    }

    setIsLoading(true);
    try {
      const updated = await apiClient<ApiRecurringTransaction>(
        `/recurring-transactions/${recurring.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            amount: parsedAmount,
            description: description.trim() || undefined,
            categoryId: categoryId || undefined,
            frequency,
            nextDueDate,
            isActive,
          }),
        }
      );

      onSuccess?.(updated);
      onOpenChange(false);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to update recurring transaction.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit Recurring Schedule</DialogTitle>
        <DialogDescription>
          Update recurring rule details, schedule, or toggle active state.
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
            <Label htmlFor="edit-rec-amount">Amount</Label>
            <Input
              id="edit-rec-amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-rec-freq">Frequency</Label>
            <select
              id="edit-rec-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as any)}
              disabled={isLoading}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-rec-cat">Category</Label>
          <select
            id="edit-rec-cat"
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
          <Label htmlFor="edit-rec-desc">Description</Label>
          <Input
            id="edit-rec-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="edit-rec-date">Next Due Date</Label>
            <Input
              id="edit-rec-date"
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <div className="flex items-center gap-2 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={isLoading}
                  className="rounded border-input text-primary focus:ring-ring"
                />
                Active Schedule
              </label>
            </div>
          </div>
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
