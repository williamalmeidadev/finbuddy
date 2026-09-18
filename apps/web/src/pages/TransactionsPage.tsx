import React, { useState } from "react";
import {
  useTransactions,
  useAccounts,
  useCategories,
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
} from "@/lib/queries";
import { ApiTransaction, ApiAccount, ApiCategory } from "@/lib/api/types";
import { useDebounce } from "@/hooks/use-debounce";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/sonner";
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
  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const filterParams = typeFilter !== "ALL" ? { type: typeFilter } : undefined;

  const { data: transactions = [], isLoading: isTxLoading, error: txError, refetch: refetchTx } = useTransactions(filterParams);
  const { data: accounts = [], isLoading: isAccLoading, refetch: refetchAcc } = useAccounts();
  const { data: categories = [], isLoading: isCatLoading, refetch: refetchCat } = useCategories();

  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const isLoading = isTxLoading || isAccLoading || isCatLoading;
  const error = txError ? (txError instanceof Error ? txError.message : "Erro ao carregar transações.") : "";

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

  const handleRefresh = () => {
    refetchTx();
    refetchAcc();
    refetchCat();
  };

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
          year: "numeric",
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
    if (!amount || !accountId) return;
    setIsSubmitting(true);
    try {
      await createTransaction.mutateAsync({
        accountId,
        categoryId: categoryId || undefined,
        amount: parseFloat(amount),
        type,
        description: description || undefined,
        transactionAt: new Date(txDate).toISOString(),
      });
      setDescription("");
      setAmount("");
      setAccountId("");
      setCategoryId("");
      setIsCreateOpen(false);
      toast.success("Transação lançada com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao lançar transação.");
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
      await updateTransaction.mutateAsync({
        id: editingTx.id,
        dto: {
          description: editDescription || undefined,
          amount: parseFloat(editAmount),
          categoryId: editCategoryId || undefined,
        },
      });
      setEditingTx(null);
      toast.success("Transação atualizada com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao atualizar transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransaction.mutateAsync(id);
      setDeleteConfirmId(null);
      toast.success("Transação excluída com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir transação.");
    }
  };

  // Client-side search filtering
  const filteredTransactions = transactions.filter((tx) => {
    if (!debouncedSearchTerm) return true;
    const term = debouncedSearchTerm.toLowerCase();
    const matchesDesc = tx.description?.toLowerCase().includes(term);
    const matchesCat = tx.category?.name.toLowerCase().includes(term);
    const matchesAccount = tx.account?.name.toLowerCase().includes(term);
    return matchesDesc || matchesCat || matchesAccount;
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Extrato de Transações</h1>
          <p className="text-muted-foreground text-sm">
            Histórico completo de receitas e despesas registradas.
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
                Nova Transação
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Lançar Transação</DialogTitle>
                <DialogDescription>
                  Adicione uma receita ou despesa na sua conta.
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
                      Despesa
                    </Button>
                    <Button
                      type="button"
                      variant={type === "INCOME" ? "default" : "outline"}
                      className={type === "INCOME" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
                      onClick={() => setType("INCOME")}
                      disabled={isSubmitting}
                    >
                      Receita
                    </Button>
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
                    <Label htmlFor="account" className="text-right">
                      Conta
                    </Label>
                    <div className="col-span-3">
                      <Select value={accountId} onValueChange={(v) => setAccountId(v || "")}>
                        <SelectTrigger id="account">
                          <SelectValue placeholder="Selecione a conta..." />
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
                    <Label htmlFor="description" className="text-right">
                      Descrição
                    </Label>
                    <Input
                      id="description"
                      placeholder="Ex: Mercado, Combustível, Salário"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="txDate" className="text-right">
                      Data/Hora
                    </Label>
                    <Input
                      id="txDate"
                      type="datetime-local"
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
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
                    {isSubmitting ? "Salvando..." : "Salvar Transação"}
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

      {/* Filter & Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-3.5 md:px-4 md:py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80 flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por descrição, conta ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filtrar por:</span>
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v || "ALL")}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Tipo..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os Tipos</SelectItem>
                <SelectItem value="INCOME">Receitas</SelectItem>
                <SelectItem value="EXPENSE">Despesas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List Table / Cards */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Movimentações</CardTitle>
          <CardDescription>
            Exibindo {filteredTransactions.length} registros encontrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando transações...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma transação encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                    <div
                      className={`p-2.5 rounded-full shrink-0 ${
                        tx.type === "INCOME"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {tx.type === "INCOME" ? (
                        <ArrowDownLeft className="h-5 w-5" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {tx.description || tx.category?.name || "Sem descrição"}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(tx.transactionAt)}
                        </span>

                        {tx.account?.name && (
                          <span className="font-medium text-foreground/80">
                            • {tx.account.name}
                          </span>
                        )}

                        {tx.category?.name && (
                          <span className="inline-flex items-center gap-1 bg-muted px-2 py-0.5 rounded-full text-[11px] font-medium text-foreground">
                            <Tag className="h-3 w-3" />
                            {tx.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`font-bold text-base ${
                        tx.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => handleOpenEdit(tx)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>

                    {deleteConfirmId === tx.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => handleDelete(tx.id)}
                          disabled={deleteTransaction.isPending}
                        >
                          {deleteTransaction.isPending ? "Excluindo..." : "Sim"}
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={deleteTransaction.isPending}
                        >
                          Não
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => setDeleteConfirmId(tx.id)}
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
      <Dialog open={!!editingTx} onOpenChange={(open) => !open && setEditingTx(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Transação</DialogTitle>
            <DialogDescription>Altere a descrição, valor ou categoria da transação.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
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
                <Label htmlFor="edit-category" className="text-right">
                  Categoria
                </Label>
                <div className="col-span-3">
                  <Select value={editCategoryId} onValueChange={(v) => setEditCategoryId(v || "")}>
                    <SelectTrigger id="edit-category">
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
                <Label htmlFor="edit-description" className="text-right">
                  Descrição
                </Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="col-span-3"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditingTx(null)} disabled={isSubmitting}>
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

export default TransactionsPage;
