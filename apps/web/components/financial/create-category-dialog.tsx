"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiCategory } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (category: ApiCategory) => void;
}

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateCategoryDialogProps) {
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [color, setColor] = React.useState("#3b82f6");
  const [icon, setIcon] = React.useState("tag");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const category = await apiClient<ApiCategory>("/categories", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          type,
          color: color || undefined,
          icon: icon || undefined,
        }),
      });

      onSuccess?.(category);
      onOpenChange(false);
      setName("");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create category.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Add Category</DialogTitle>
        <DialogDescription>
          Create a new income or expense category to organize transactions.
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
          <Label htmlFor="cat-name">Category Name</Label>
          <Input
            id="cat-name"
            placeholder="e.g. Housing, Salaries, Groceries"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Category Type</Label>
          <div className="flex rounded-md border p-1 bg-muted/30">
            <button
              type="button"
              className={`flex-1 rounded py-1 text-xs font-semibold transition-colors ${
                type === "EXPENSE"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setType("EXPENSE")}
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
              onClick={() => setType("INCOME")}
            >
              Income
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="cat-color">Color Accent</Label>
            <div className="flex items-center gap-2">
              <Input
                id="cat-color"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isLoading}
                className="h-9 w-12 cursor-pointer p-1"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                disabled={isLoading}
                className="font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-icon">Icon Identifier</Label>
            <Input
              id="cat-icon"
              placeholder="e.g. tag, shopping-bag, home"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? "Saving..." : "Create Category"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
