import React, { useState } from "react";
import {
  useBudgets,
  useCategories,
  useCreateBudget,
  useUpdateBudget,
  useDeleteBudget,
} from "@/lib/queries";
import { ApiBudget } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Target, PlusCircle, Trash2, Edit2, RefreshCw, AlertCircle, Filter } from "lucide-react";

export const BudgetsPage: React.FC = () => {
  const currentDate = new Date();
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(currentDate.getFullYear());

  const monthStr = `${year}-${String(month).padStart(2, "0")}`;

  const { data: budgets = [], isLoading: isBudLoading, error: budError, refetch: refetchBud } = useBudgets(monthStr);
  const { data: allCategories = [], isLoading: isCatLoading, refetch: refetchCat } = useCategories();

  const categories = allCategories.filter((c) => c.type === "EXPENSE");
  const categoryMap = React.useMemo(() => new Map(allCategories.map((c) => [c.id, c.name])), [allCategories]);

  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const isLoading = isBudLoading || isCatLoading;
  const error = budError ? (budError instanceof Error ? budError.message : "Erro ao carregar orçamentos.") : "";

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

  const handleRefresh = () => {
    refetchBud();
    refetchCat();
  };

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
      await createBudget.mutateAsync({
        categoryId,
        amount: parseFloat(amount),
        month: monthStr,
      });
      setCategoryId("");
      setAmount("");
      setIsCreateOpen(false);
      toast.success("Orçamento criado com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar orçamento.");
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
      await updateBudget.mutateAsync({
        id: editingBudget.id,
        dto: {
          amount: parseFloat(editAmount),
        },
      });
      setEditingBudget(null);
      toast.success("Orçamento atualizado com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar orçamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget.mutateAsync(id);
      setDeleteConfirmId(null);
      toast.success("Orçamento excluído com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir orçamento.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Metas e Orçamentos</h1>
          <p className="text-muted-foreground text-sm">
            Planeje limites de gastos mensais por categoria de despesa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
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
                <DialogDescription>
                  Selecione uma categoria e o valor limite para este mês.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="category" className="text-right">
                      Categoria
                    </Label>
                    <div className="col-span-3">
                      <Select value={categoryId} onValueChange={(v) => setCategoryId(v || "")}>
                        <SelectTrigger id="category">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      Limite (R$)
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Salvar Orçamento"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Month/Year Filter Selector */}
      <Card className="shadow-sm">
        <CardContent className="p-3.5 md:px-4 md:py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Mês de Referência:</span>
          </div>
          <Select value={month.toString()} onValueChange={(v) => v && setMonth(parseInt(v))}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Janeiro</SelectItem>
              <SelectItem value="2">Fevereiro</SelectItem>
              <SelectItem value="3">Março</SelectItem>
              <SelectItem value="4">Abril</SelectItem>
              <SelectItem value="5">Maio</SelectItem>
              <SelectItem value="6">Junho</SelectItem>
              <SelectItem value="7">Julho</SelectItem>
              <SelectItem value="8">Agosto</SelectItem>
              <SelectItem value="9">Setembro</SelectItem>
              <SelectItem value="10">Outubro</SelectItem>
              <SelectItem value="11">Novembro</SelectItem>
              <SelectItem value="12">Dezembro</SelectItem>
            </SelectContent>
          </Select>

          <Select value={year.toString()} onValueChange={(v) => v && setYear(parseInt(v))}>
            <SelectTrigger className="w-[100px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025">2025</SelectItem>
              <SelectItem value="2026">2026</SelectItem>
              <SelectItem value="2027">2027</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Budgets List Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando orçamentos...</div>
      ) : budgets.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card p-8">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-lg">Nenhum orçamento para {monthStr}</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Defina limites mensais para controlar seus gastos por categoria.
          </p>
          <Button onClick={() => setIsCreateOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Criar Primeiro Orçamento
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((b) => {
            const spent = b.spentAmount ?? b.spent ?? 0;
            const progress = b.amount > 0 ? Math.min(100, (spent / b.amount) * 100) : 0;
            const isExceeded = spent > b.amount;
            const categoryName = b.category?.name || categoryMap.get(b.categoryId) || "Categoria";

            return (
              <Card key={b.id} className="shadow-sm flex flex-col justify-between">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle className="text-base font-bold">
                      {categoryName}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Mês: {b.month}
                    </CardDescription>
                  </div>
                  <Target className={`h-5 w-5 ${isExceeded ? "text-red-500" : "text-primary"}`} />
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="flex items-end justify-between">
                    <div>
                      <span className="text-xs text-muted-foreground">Gasto Atual</span>
                      <p className={`text-lg font-bold ${isExceeded ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>
                        {formatCurrency(spent)}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Limite</span>
                      <p className="text-sm font-semibold text-foreground">
                        {formatCurrency(b.amount)}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isExceeded ? "bg-red-500" : progress > 80 ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-right font-medium text-muted-foreground">
                    {progress.toFixed(0)}% do orçamento utilizado
                  </p>
                </CardContent>

                <CardFooter className="py-3 border-t bg-muted/20 flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => handleOpenEdit(b)}
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" />
                    Editar
                  </Button>

                  {deleteConfirmId === b.id ? (
                    <div className="flex items-center gap-1">
                      <Button
                        size="xs"
                        variant="destructive"
                        onClick={() => handleDelete(b.id)}
                        disabled={deleteBudget.isPending}
                      >
                        {deleteBudget.isPending ? "Excluindo..." : "Sim"}
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(null)}
                        disabled={deleteBudget.isPending}
                      >
                        Não
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-muted-foreground hover:text-red-500"
                      onClick={() => setDeleteConfirmId(b.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" />
                      Excluir
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Budget Dialog */}
      <Dialog open={!!editingBudget} onOpenChange={(open) => !open && setEditingBudget(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Teto de Orçamento</DialogTitle>
            <DialogDescription>
              Categoria: {editingBudget?.category?.name || (editingBudget ? categoryMap.get(editingBudget.categoryId) : "") || "Categoria"} ({editingBudget?.month})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-amount" className="text-right">
                  Novo Limite
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingBudget(null)} disabled={isSubmitting}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BudgetsPage;
