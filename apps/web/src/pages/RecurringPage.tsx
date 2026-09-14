import React, { useState, useEffect, useCallback } from "react";
import { recurringService, accountService, categoryService } from "@/lib/api/services";
import { ApiRecurringTransaction, ApiAccount, ApiCategory, RecurrenceFrequency } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Repeat, PlusCircle, Trash2, Edit2, Calendar, RefreshCw, AlertCircle } from "lucide-react";

export const RecurringPage: React.FC = () => {
  const [recurringRules, setRecurringRules] = useState<ApiRecurringTransaction[]>([]);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [recRes, accRes, catRes] = await Promise.all([
        recurringService.findAll(),
        accountService.findAll(),
        categoryService.findAll(),
      ]);
      setRecurringRules(recRes);
      setAccounts(accRes);
      setCategories(catRes);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar transações recorrentes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR");
    } catch {
      return dateStr;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalAccountId = accountId || (accounts.length > 0 ? accounts[0].id : "");
    if (!amount || !finalAccountId || !nextDueDate) return;
    setIsSubmitting(true);
    try {
      await recurringService.create({
        accountId: finalAccountId,
        categoryId: categoryId || undefined,
        amount: parseFloat(amount),
        type,
        frequency,
        description: description || undefined,
        startDate: nextDueDate,
      });
      setDescription("");
      setAmount("");
      setAccountId("");
      setCategoryId("");
      setIsCreateOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erro ao cadastrar transação recorrente.");
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
    if (!editingRule || !editAmount) return;
    setIsSubmitting(true);
    try {
      await recurringService.update(editingRule.id, {
        description: editDescription || undefined,
        amount: parseFloat(editAmount),
        frequency: editFrequency,
      });
      setEditingRule(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erro ao editar regra recorrente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await recurringService.delete(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: any) {
      alert(err?.message || "Erro ao desativar regra recorrente.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transações Recorrentes</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie assinaturas, contas fixas e receitas automáticas.
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
                Nova Recorrência / New Schedule
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Lançar Regra Recorrente</DialogTitle>
                <DialogDescription>Cadastre um gasto ou ganho repetitivo.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      type="button"
                      variant={type === "EXPENSE" ? "default" : "outline"}
                      className={type === "EXPENSE" ? "bg-red-500 hover:bg-red-600 text-white" : ""}
                      onClick={() => setType("EXPENSE")}
                    >
                      Despesa Fixa
                    </Button>
                    <Button
                      type="button"
                      variant={type === "INCOME" ? "default" : "outline"}
                      className={type === "INCOME" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                      onClick={() => setType("INCOME")}
                    >
                      Receita Fixa
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rec-desc">Descrição</Label>
                    <Input
                      id="rec-desc"
                      placeholder="Ex: Aluguel, Netflix, Salário..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rec-amount">Valor (R$)</Label>
                    <Input
                      id="rec-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rec-freq">Frequência</Label>
                    <select
                      id="rec-freq"
                      className="w-full p-2 border rounded-md bg-background text-sm"
                      value={frequency}
                      onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)}
                    >
                      <option value="DAILY">Diário</option>
                      <option value="WEEKLY">Semanal</option>
                      <option value="MONTHLY">Mensal</option>
                      <option value="YEARLY">Anual</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="date">Próximo Vencimento</Label>
                    <Input
                      id="date"
                      type="date"
                      value={nextDueDate}
                      onChange={(e) => setNextDueDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rec-account">Conta</Label>
                    <select
                      id="rec-account"
                      className="w-full p-2 border rounded-md bg-background text-sm"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      <option value="">Selecione a conta</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="rec-category">Categoria</Label>
                    <select
                      id="rec-category"
                      className="w-full p-2 border rounded-md bg-background text-sm"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                    >
                      <option value="">Selecione a categoria</option>
                      {categories
                        .filter((c) => c.type === type)
                        .map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Lançando..." : "Confirmar Recorrência"}
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

      {/* Rules List */}
      <Card className="shadow-sm border">
        <CardHeader>
          <CardTitle className="text-lg">Regras de Recorrência Ativas</CardTitle>
          <CardDescription>Cobranças e lançamentos repetitivos programados.</CardDescription>
        </CardHeader>
        <CardContent>
          {recurringRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              <AlertCircle className="h-8 w-8 mb-2 stroke-1" />
              Nenhuma transação recorrente cadastrada.
            </div>
          ) : (
            <div className="space-y-4">
              {recurringRules.map((r) => (
                <div key={r.id} className="flex items-center justify-between border-b pb-3.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${r.type === "INCOME" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                      <Repeat className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{r.description || (r.type === "INCOME" ? "Receita Recorrente" : "Despesa Recorrente")}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="font-medium">{r.frequency}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 inline" />
                          Próximo: {formatDate(r.nextDueDate || r.nextOccurrence || "")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-bold ${r.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {r.type === "INCOME" ? "+" : "-"}{formatCurrency(r.amount)}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(r)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editingRule !== null} onOpenChange={(open) => { if (!open) setEditingRule(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Recorrência</DialogTitle>
            <DialogDescription>Ajuste os dados da regra recorrente.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-desc">Descrição</Label>
                <Input
                  id="edit-desc"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-val">Valor (R$)</Label>
                <Input
                  id="edit-val"
                  type="number"
                  step="0.01"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-freq">Frequência</Label>
                <Select
                  value={editFrequency}
                  onValueChange={(val) => val && setEditFrequency(val as RecurrenceFrequency)}
                  items={[
                    { label: "Diário", value: "DAILY" },
                    { label: "Semanal", value: "WEEKLY" },
                    { label: "Mensal", value: "MONTHLY" },
                    { label: "Anual", value: "YEARLY" }
                  ]}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Frequência" />
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
            <DialogTitle>Desativar Recorrência</DialogTitle>
            <DialogDescription>Tem certeza que deseja desativar esta regra de recorrência?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Desativar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
