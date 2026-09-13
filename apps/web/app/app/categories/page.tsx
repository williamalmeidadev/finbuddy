"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, RefreshCw, Tag } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { ApiCategory } from "@/lib/api/types";
import { CreateCategoryDialog } from "@/components/financial/create-category-dialog";
import { EditCategoryDialog } from "@/components/financial/edit-category-dialog";
import { ConfirmDeleteDialog } from "@/components/financial/confirm-delete-dialog";

export default function CategoriesPage() {
  const [categories, setCategories] = React.useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Dialog states
  const [openCreate, setOpenCreate] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<ApiCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = React.useState<ApiCategory | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const fetchCategories = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiClient<ApiCategory[]>("/categories");
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Failed to load categories.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setIsDeleting(true);
    try {
      await apiClient(`/categories/${deletingCategory.id}`, { method: "DELETE" });
      setDeletingCategory(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.message || "Failed to delete category.");
    } finally {
      setIsDeleting(false);
    }
  };

  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");
  const incomeCategories = categories.filter((c) => c.type === "INCOME");

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Financial Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage categories for classifying income and expense entries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={fetchCategories}
            disabled={isLoading}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setOpenCreate(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Add Category
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Two Columns: Expenses & Income */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Expense Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-base font-semibold text-rose-600 dark:text-rose-400">
                Expense Categories
              </CardTitle>
              <CardDescription>Target limits & ledger tagging</CardDescription>
            </div>
            <Badge variant="outline">{expenseCategories.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {expenseCategories.length === 0 && !isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No expense categories defined.
              </div>
            ) : (
              <div className="divide-y text-sm">
                {expenseCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full border shadow-sm"
                        style={{ backgroundColor: cat.color || "#e11d48" }}
                      />
                      <span className="font-medium">{cat.name}</span>
                      {cat.isSystem && (
                        <Badge variant="secondary" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingCategory(cat)}
                        title="Edit Category"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {!cat.isSystem && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeletingCategory(cat)}
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Income Categories */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between py-4">
            <div>
              <CardTitle className="text-base font-semibold text-emerald-600 dark:text-emerald-400">
                Income Categories
              </CardTitle>
              <CardDescription>Revenue sources & earnings classification</CardDescription>
            </div>
            <Badge variant="outline">{incomeCategories.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            {incomeCategories.length === 0 && !isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No income categories defined.
              </div>
            ) : (
              <div className="divide-y text-sm">
                {incomeCategories.map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between p-3.5 hover:bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full border shadow-sm"
                        style={{ backgroundColor: cat.color || "#10b981" }}
                      />
                      <span className="font-medium">{cat.name}</span>
                      {cat.isSystem && (
                        <Badge variant="secondary" className="text-[10px]">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => setEditingCategory(cat)}
                        title="Edit Category"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      {!cat.isSystem && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeletingCategory(cat)}
                          title="Delete Category"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateCategoryDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onSuccess={() => fetchCategories()}
      />
      <EditCategoryDialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
        category={editingCategory}
        onSuccess={() => fetchCategories()}
      />
      <ConfirmDeleteDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
        title="Delete Category"
        description={`Are you sure you want to delete category "${deletingCategory?.name}"?`}
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
