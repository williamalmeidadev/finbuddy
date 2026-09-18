import React, { useState } from "react";
import {
  useRecurringTransactions,
  useAccounts,
  useCategories,
  useCreateRecurringTransaction,
  useUpdateRecurringTransaction,
  useDeleteRecurringTransaction,
} from "@/lib/queries";
import { ApiRecurringTransaction, ApiAccount, ApiCategory, RecurrenceFrequency } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
import { Repeat, PlusCircle, Trash2, Edit2, Calendar, RefreshCw, AlertCircle } from "lucide-react";

export const RecurringPage: React.FC = () => {
  const { data: recurringRules = [], isLoading: isRecLoading, error: recError, refetch: refetchRec } = useRecurringTransactions();
  const { data: accounts = [], isLoading: isAccLoading, refetch: refetchAcc } = useAccounts();
  const { data: categories = [], isLoading: isCatLoading, refetch: refetchCat } = useCategories();

  const createRecurring = useCreateRecurringTransaction();
  const updateRecurring = useUpdateRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();

  const isLoading = isRecLoading || isAccLoading || isCatLoading;
  const error = recError ? (recError instanceof Error ? recError.message : "Erro ao carregar transações recorrentes.") : "";

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>("MONTHLY");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().substring(0, 10));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingRule, setEditingRule] = useState<ApiRecurringTransaction | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editFrequency, setEditFrequency] = useState<RecurrenceFrequency>("MONTHLY");

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleRefresh = () => {
    refetchRec();
    refetchAcc();
    refetchCat();
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const getFrequencyLabel = (freq: string) => {
    switch (freq) {
      case "DAILY":
        return "Diário";
      case "WEEKLY":
        return "Semanal";
      case "MONTHLY":
        return "Mensal";
      case "YEARLY":
        return "Anual";
      default:
        return freq;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId || !description) return;
    setIsSubmitting(true);
    try {
      await createRecurring.mutateAsync({
        accountId,
        categoryId: categoryId || undefined,
        amount: parseFloat(amount),
        type,
        frequency,
        description,
        startDate: nextDueDate,
      });
      setDescription("");
      setAmount("");
      setAccountId("");
      setCategoryId("");
      setIsCreateOpen(false);
      toast.success("Regra de recorrência criada com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar regra de recorrência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (rule: ApiRecurringTransaction) => {
    setEditingRule(rule);
    setEditDescription(rule.description || "");
    setEditAmount(rule.amount.toString());
    setEditFrequency(rule.frequency);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule || !editAmount || !editDescription) return;
    setIsSubmitting(true);
    try {
      await updateRecurring.mutateAsync({
        id: editingRule.id,
        dto: {
          description: editDescription,
          amount: parseFloat(editAmount),
          frequency: editFrequency,
        },
      });
      setEditingRule(null);
      toast.success("Regra de recorrência atualizada com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar regra.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRecurring.mutateAsync(id);
      setDeleteConfirmId(null);
      toast.success("Regra de recorrência excluída com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir regra.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transações Recorrentes</h1>
          <p className="text-muted-foreground text-sm">
            Cadastre assinaturas, salários e contas fixas para automatização financeira.
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
                Nova Recorrência
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Regra Recorrente</DialogTitle>
                <DialogDescription>
                  Configure contas ou receitas recorrentes (ex: Aluguel, Netflix, Salário).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={type === "EXPENSE" ? "default" : "outline"}
                      className={type === "EXPENSE" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
                      onClick={() => setType("EXPENSE")}
                      disabled={isSubmitting}
                    >
                      Despesa Fixo
                    </Button>
                    <Button
                      type="button"
                      variant={type === "INCOME" ? "default" : "outline"}
                      className={type === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                      onClick={() => setType("INCOME")}
                      disabled={isSubmitting}
                    >
                      Receita Fixo
                    </Button>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Descrição
                    </Label>
                    <Input
                      id="description"
                      placeholder="Ex: Netflix, Salário, Internet"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="amount" className="text-right">
                      Valor
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

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="frequency" className="text-right">
                      Frequência
                    </Label>
                    <div className="col-span-3">
                      <Select value={frequency} onValueChange={(v) => setFrequency(v as RecurrenceFrequency)}>
                        <SelectTrigger id="frequency">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Diário</SelectItem>
                          <SelectItem value="WEEKLY">Semanal</SelectItem>
                          <SelectItem value="MONTHLY">Mensal</SelectItem>
                          <SelectItem value="YEARLY">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="account" className="text-right">
                      Conta
                    </Label>
                    <div className="col-span-3">
                      <Select value={accountId} onValueChange={(v) => setAccountId(v || "")}>
                        <SelectTrigger id="account">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => (
                            <SelectItem key={a.id} value={a.id}>
                              {a.name} ({formatCurrency(a.balance)})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

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
                    <Label htmlFor="startDate" className="text-right">
                      Início
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
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
                    {isSubmitting ? "Salvando..." : "Salvar Recorrência"}
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

      {/* Recurring Rules List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Regras Programadas</CardTitle>
          <CardDescription>
            {recurringRules.length} transações recorrentes ativas cadastradas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando recorrências...</div>
          ) : recurringRules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma transação recorrente cadastrada até o momento.
            </div>
          ) : (
            <div className="space-y-3">
              {recurringRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                    <div
                      className={`p-2.5 rounded-full shrink-0 ${
                        rule.type === "INCOME"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      <Repeat className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {rule.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium text-foreground bg-muted px-2 py-0.5 rounded text-[11px]">
                          {getFrequencyLabel(rule.frequency)}
                        </span>
                        {rule.nextDueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Próxima: {formatDate(rule.nextDueDate)}
                          </span>
                        )}
                        {rule.account?.name && <span>• {rule.account.name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`font-bold text-base ${
                        rule.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {rule.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(rule.amount)}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(rule)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>

                    {deleteConfirmId === rule.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => handleDelete(rule.id)}
                          disabled={deleteRecurring.isPending}
                        >
                          {deleteRecurring.isPending ? "Excluindo..." : "Sim"}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={deleteRecurring.isPending}
                        >
                          Não
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => setDeleteConfirmId(rule.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingRule} onOpenChange={(open) => !open && setEditingRule(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Recorrência</DialogTitle>
            <DialogDescription>Altere o valor, descrição ou frequência.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-desc" className="text-right">
                  Descrição
                </Label>
                <Input
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-amount" className="text-right">
                  Valor
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

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-frequency" className="text-right">
                  Frequência
                </Label>
                <div className="col-span-3">
                  <Select value={editFrequency} onValueChange={(v) => setEditFrequency(v as RecurrenceFrequency)}>
                    <SelectTrigger id="edit-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Diário</SelectItem>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingRule(null)} disabled={isSubmitting}>
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

export default RecurringPage;
