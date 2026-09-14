import React, { useState, useEffect, useCallback } from "react";
import { transactionService, accountService, categoryService } from "@/lib/api/services";
import { ApiTransaction, ApiAccount, ApiCategory } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Trash2,
  Edit2,
  Calendar,
  Tag,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().substring(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal State
  const [editingTx, setEditingTx] = useState<ApiTransaction | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [txRes, accRes, catRes] = await Promise.all([
        transactionService.findAll(),
        accountService.findAll(),
        categoryService.findAll(),
      ]);
      setTransactions(txRes);
      setAccounts(accRes);
      setCategories(catRes);
      if (accRes.length > 0 && !accountId) {
        setAccountId(accRes[0].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar transações.");
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

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
      return (
        d.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }) +
        " " +
        d.toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch {
      return dateStr;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetAccountId = accountId || (accounts.length > 0 ? accounts[0].id : "");
    if (!amount || !targetAccountId) return;
    setIsSubmitting(true);
    try {
      await transactionService.create({
        accountId: targetAccountId,
        categoryId: categoryId || undefined,
        amount: parseFloat(amount),
        type,
        description: description || undefined,
        transactionAt: new Date(txDate).toISOString(),
      });
      setDescription("");
      setAmount("");
      setCategoryId("");
      setIsCreateOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao cadastrar transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (tx: ApiTransaction) => {
    setEditingTx(tx);
    setEditDescription(tx.description || "");
    setEditAmount(tx.amount.toString());
    setEditCategoryId(tx.categoryId || "");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !editAmount) return;
    setIsSubmitting(true);
    try {
      await transactionService.update(editingTx.id, {
        description: editDescription || undefined,
        amount: parseFloat(editAmount),
        categoryId: editCategoryId || undefined,
      });
      setEditingTx(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao editar transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await transactionService.delete(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir transação.");
    }
  };

  // Filtered transactions
  const filteredTransactions = transactions.filter((tx) => {
    if (typeFilter !== "ALL" && tx.type !== typeFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchDesc = tx.description?.toLowerCase().includes(term);
      const matchCat = tx.category?.name.toLowerCase().includes(term);
      const matchAcc = tx.account?.name.toLowerCase().includes(term);
      if (!matchDesc && !matchCat && !matchAcc) return false;
    }
    return true;
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transações</h1>
          <p className="text-muted-foreground text-sm">
            Histórico completo de entradas e saídas financeiras.
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
                Record Transaction / Lançar Transação
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Lançar Transação</DialogTitle>
                <DialogDescription>Cadastre uma receita ou despesa na sua conta.</DialogDescription>
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
                      Expense / Despesa
                    </Button>
                    <Button
                      type="button"
                      variant={type === "INCOME" ? "default" : "outline"}
                      className={type === "INCOME" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
                      onClick={() => setType("INCOME")}
                    >
                      Income / Receita
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tx-desc">Descrição</Label>
                    <Input
                      id="tx-desc"
                      placeholder="Ex: Mercado, Aluguel..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tx-amount">Valor (R$)</Label>
                    <Input
                      id="tx-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="date">Data & Hora</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tx-account">Conta</Label>
                    <select
                      id="tx-account"
                      className="w-full p-2 border rounded-md bg-background text-sm"
                      value={accountId}
                      onChange={(e) => setAccountId(e.target.value)}
                    >
                      <option value="">Selecione a conta</option>
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tx-category">Categoria</Label>
                    <select
                      id="tx-category"
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
                    {isSubmitting ? "Lançando..." : "Confirmar Lançamento"}
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

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="relative w-full sm:w-80">
              <Input
                placeholder="Buscar por descrição, conta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select
                value={typeFilter}
                onValueChange={(val) => val && setTypeFilter(val)}
                items={[
                  { label: "Todas os Tipos", value: "ALL" },
                  { label: "Somente Receitas", value: "INCOME" },
                  { label: "Somente Despesas", value: "EXPENSE" }
                ]}
              >
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todas os Tipos</SelectItem>
                  <SelectItem value="INCOME">Somente Receitas</SelectItem>
                  <SelectItem value="EXPENSE">Somente Despesas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List Card */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Lançamentos</CardTitle>
          <CardDescription>
            Mostrando {filteredTransactions.length} de {transactions.length} transações.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              <AlertCircle className="h-8 w-8 mb-2 stroke-1" />
              Nenhuma transação encontrada com os filtros atuais.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between border-b pb-3.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-full ${tx.type === "INCOME" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                      {tx.type === "INCOME" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate text-foreground">
                        {tx.description || (tx.type === "INCOME" ? "Receita" : "Despesa")}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {tx.account && <span className="font-medium text-foreground/80">{tx.account.name}</span>}
                        {tx.category && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1"><Tag className="h-3 w-3 inline" />{tx.category.name}</span>
                          </>
                        )}
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3 inline" />{formatDate(tx.transactionAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-sm font-bold ${tx.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                    {!tx.isSystem && (
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(tx)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(tx.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <Dialog open={editingTx !== null} onOpenChange={(open) => { if (!open) setEditingTx(null); }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>Ajuste os dados do lançamento.</DialogDescription>
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
                <Label htmlFor="edit-cat">Categoria</Label>
                <Select
                  value={editCategoryId}
                  onValueChange={(val) => setEditCategoryId(val || "")}
                  items={categories.filter(c => c.type === editingTx?.type).map(cat => ({ label: cat.name, value: cat.id }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories
                      .filter((c) => c.type === editingTx?.type)
                      .map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
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
            <DialogTitle>Excluir Transação</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta transação?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Confirm Delete / Confirmar Exclusão</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
