"use client";

import * as React from "react";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api/client";
import { ApiCategory } from "@/lib/api/types";
import { AlertCircle } from "lucide-react";

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: ApiCategory | null;
  onSuccess?: (category: ApiCategory) => void;
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: EditCategoryDialogProps) {
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#3b82f6");
  const [icon, setIcon] = React.useState("tag");
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color || "#3b82f6");
      setIcon(category.icon || "tag");
      setErrorMsg(null);
    }
  }, [category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return;
    setErrorMsg(null);

    setIsLoading(true);
    try {
      const updated = await apiClient<ApiCategory>(`/categories/${category.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim() || undefined,
          color: color || undefined,
          icon: icon || undefined,
        }),
      });

      onSuccess?.(updated);
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to update category.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>Edit Category</DialogTitle>
        <DialogDescription>
          Update category name, icon, or accent color.
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
          <Label htmlFor="edit-cat-name">Category Name</Label>
          <Input
            id="edit-cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="edit-cat-color">Color Accent</Label>
            <div className="flex items-center gap-2">
              <Input
                id="edit-cat-color"
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
            <Label htmlFor="edit-cat-icon">Icon Identifier</Label>
            <Input
              id="edit-cat-icon"
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
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
