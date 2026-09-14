import React, { useState, useEffect, useCallback } from "react";
import { budgetService, categoryService } from "@/lib/api/services";
import { ApiBudget, ApiCategory } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Target, PlusCircle, Trash2, Edit2, RefreshCw, AlertCircle } from "lucide-react";

export const BudgetsPage: React.FC = () => {
  const [budgets, setBudgets] = useState<ApiBudget[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const currentDate = new Date();
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(currentDate.getFullYear());

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editingBudget, setEditingBudget] = useState<ApiBudget | null>(null);
  const [editAmount, setEditAmount] = useState("");

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      const [budRes, catRes] = await Promise.all([
        budgetService.findAll(monthStr),
        categoryService.findAll(),
      ]);
      setBudgets(budRes);
      setCategories(catRes.filter(c => c.type === "EXPENSE"));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar orçamentos.");
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount) return;
    setIsSubmitting(true);
    try {
      const monthStr = `${year}-${String(month).padStart(2, "0")}`;
      await budgetService.create({
        categoryId,
        month: monthStr,
        amount: parseFloat(amount),
      });
      setCategoryId("");
      setAmount("");
      setIsCreateOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao criar orçamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (b: ApiBudget) => {
    setEditingBudget(b);
    setEditAmount(b.amount.toString());
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBudget || !editAmount) return;
    setIsSubmitting(true);
    try {
      await budgetService.update(editingBudget.id, {
        amount: parseFloat(editAmount),
      });
      setEditingBudget(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao editar orçamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await budgetService.delete(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir orçamento.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Orçamentos</h1>
          <p className="text-muted-foreground text-sm">
            Defina e controle metas de gastos por categoria mensal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Novo Orçamento
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Definir Teto de Gastos</DialogTitle>
                <DialogDescription>Escolha uma categoria e um limite para o mês atual.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cat">Categoria de Despesa</Label>
                    <Select
                      value={categoryId}
                      onValueChange={(val) => setCategoryId(val || "")}
                      items={categories.map(cat => ({ label: cat.name, value: cat.id }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="val">Limite de Gasto (R$)</Label>
                    <Input
                      id="val"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Definir Orçamento"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="p-4 text-sm text-destructive bg-destructive/10 rounded-lg border border-destructive/20 font-medium">
          {error}
        </div>
      )}

      {/* Grid of Budgets */}
      {budgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-card text-center text-muted-foreground">
          <AlertCircle className="h-12 w-12 mb-3 stroke-1 text-amber-500" />
          <p className="font-semibold text-lg">Nenhum orçamento cadastrado</p>
          <p className="text-sm mt-1 mb-4">Defina limites para suas categorias de despesa.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const spent = b.spent ?? b.spentAmount ?? 0;
            const remaining = b.remaining ?? (b.amount - spent);
            const percentage = b.percentageUsed ?? Math.min(100, Math.round((spent / (b.amount || 1)) * 100));
            const isOverBudget = spent > b.amount;

            return (
              <Card key={b.id} className="shadow-sm border">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-base font-bold">
                      {b.category?.name || categories.find((c) => c.id === b.categoryId)?.name || "Categoria"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Teto: {formatCurrency(b.amount)}
                    </CardDescription>
                  </div>
                  <div className={`p-2 rounded-lg ${isOverBudget ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"}`}>
                    <Target className="h-5 w-5" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Gasto: <strong className={isOverBudget ? "text-red-500" : "text-foreground"}>{formatCurrency(spent)}</strong></span>
                    <span>Restante: <strong>{formatCurrency(remaining)}</strong></span>
                  </div>

                  <div className="space-y-1">
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${isOverBudget ? "bg-red-500" : percentage > 85 ? "bg-amber-500" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-right text-muted-foreground">{percentage}% utilizado</p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => handleOpenEdit(b)}>
                      <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(b.id)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      <Dialog open={editingBudget !== null} onOpenChange={(open) => { if (!open) setEditingBudget(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Orçamento</DialogTitle>
            <DialogDescription>Ajuste o valor limite do orçamento.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-val">Novo Limite (R$)</Label>
                <Input
                  id="edit-val"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Orçamento</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta meta de gastos?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
