"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiBudget, ApiCategory } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

interface CreateBudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: ApiCategory[];
  onSuccess?: (budget: ApiBudget) => void;
}

export function CreateBudgetDialog({
  open,
  onOpenChange,
  categories,
  onSuccess,
}: CreateBudgetDialogProps) {
  const [categoryId, setCategoryId] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [month, setMonth] = React.useState(new Date().getMonth() + 1);
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const expenseCategories = React.useMemo(() => {
    return categories.filter((c) => c.type === "EXPENSE" && c.isActive);
  }, [categories]);

  React.useEffect(() => {
    if (expenseCategories.length > 0 && !categoryId) {
      setCategoryId(expenseCategories[0].id);
    }
  }, [expenseCategories, categoryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const parsedAmount = parseFloat(amount);
    if (!categoryId || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg("Please select a valid expense category and a positive limit.");
      return;
    }

    setIsLoading(true);
    try {
      const budget = await apiClient<ApiBudget>("/budgets", {
        method: "POST",
        body: JSON.stringify({
          categoryId,
          amount: parsedAmount,
          month: Number(month),
          year: Number(year),
        }),
      });

      onSuccess?.(budget);
      onOpenChange(false);
      setAmount("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create budget limit.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Set Category Budget</DialogTitle>
        <DialogDescription>
          Establish a spending limit for an expense category for a target month.
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
          <Label htmlFor="b-category">Target Category</Label>
          <select
            id="b-category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={isLoading}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
            required
          >
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="b-amount">Monthly Budget Limit</Label>
          <Input
            id="b-amount"
            type="number"
            step="0.01"
            placeholder="e.g. 500.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="b-month">Month</Label>
            <select
              id="b-month"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={isLoading}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm outline-none focus:ring-1 focus:ring-ring"
            >
              {[
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
              ].map((mName, i) => (
                <option key={i + 1} value={i + 1}>
                  {mName} ({i + 1})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="b-year">Year</Label>
            <Input
              id="b-year"
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !amount || !categoryId}>
            {isLoading ? "Saving..." : "Set Budget"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
