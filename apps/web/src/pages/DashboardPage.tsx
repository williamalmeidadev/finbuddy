import React, { useState } from "react";
import {
  useFinancialSummary,
  useAccounts,
  useTransactions,
  useCategories,
  useCreateTransaction,
  useCreateTransfer,
  useDeleteTransaction,
} from "@/lib/queries";
import {
  ApiAccount,
  ApiTransaction,
  ApiCategory,
} from "@/lib/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpenseCategoryChart } from "@/components/dashboard/expense-category-chart";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  ArrowRightLeft,
  Calendar,
  AlertCircle,
  Tag,
  RefreshCw,
} from "lucide-react";

export const DashboardPage: React.FC = () => {
  const { data: summary, isLoading: isSummaryLoading, error: summaryError, refetch: refetchSummary } = useFinancialSummary();
  const { data: accounts = [], isLoading: isAccountsLoading, refetch: refetchAccounts } = useAccounts();
  const { data: transactions = [], isLoading: isTxLoading, refetch: refetchTx } = useTransactions();
  const { data: categories = [], isLoading: isCatLoading, refetch: refetchCat } = useCategories();

  const createTransaction = useCreateTransaction();
  const createTransfer = useCreateTransfer();
  const deleteTransaction = useDeleteTransaction();

  const isLoading = isSummaryLoading || isAccountsLoading || isTxLoading || isCatLoading;
  const error = summaryError ? (summaryError instanceof Error ? summaryError.message : "Erro ao carregar dados do dashboard.") : "";

  // Quick transaction modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE" | "TRANSFER">("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [destinationAccountId, setDestinationAccountId] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().substring(0, 16));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRefreshAll = () => {
    refetchSummary();
    refetchAccounts();
    refetchTx();
    refetchCat();
  };

  const formatCurrency = (val?: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
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

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) return;
    if (type === "TRANSFER" && !destinationAccountId) return;
    if (type !== "TRANSFER" && !categoryId) return;

    setIsSubmitting(true);
    try {
      if (type === "TRANSFER") {
        await createTransfer.mutateAsync({
          fromAccountId: accountId,
          toAccountId: destinationAccountId,
          amount: parseFloat(amount),
          description: description || "Transferência entre contas",
          transferredAt: new Date(txDate).toISOString(),
        });
      } else {
        await createTransaction.mutateAsync({
          accountId,
          categoryId: categoryId || undefined,
          amount: parseFloat(amount),
          type: type as "INCOME" | "EXPENSE",
          description: description || undefined,
          transactionAt: new Date(txDate).toISOString(),
        });
      }

      // Reset Form
      setDescription("");
      setAmount("");
      setAccountId("");
      setCategoryId("");
      setDestinationAccountId("");
      setIsDialogOpen(false);
      toast.success(type === "TRANSFER" ? "Transferência criada com sucesso!" : "Transação criada com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteTransaction.mutateAsync(id);
      setDeleteConfirmId(null);
      toast.success("Transação excluída com sucesso!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir transação.");
    }
  };

  const totalBalance = summary?.totalBalance ?? accounts.reduce((acc, a) => acc + (a.balance || 0), 0);
  const monthlyIncome = summary?.monthlyIncome ?? transactions.filter(t => t.type === "INCOME").reduce((acc, t) => acc + t.amount, 0);
  const monthlyExpenses = summary?.monthlyExpenses ?? transactions.filter(t => t.type === "EXPENSE").reduce((acc, t) => acc + t.amount, 0);
  const netSavings = summary?.netSavings ?? (monthlyIncome - monthlyExpenses);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Visão Geral</h1>
          <p className="text-muted-foreground text-sm">
            Resumo consolidado do seu patrimônio e fluxo de caixa.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefreshAll} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar / Refresh
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Lançar Transação
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Lançar Nova Transação</DialogTitle>
                <DialogDescription>
                  Adicione receitas, despesas ou faça transferências entre contas.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveTransaction}>
                <div className="grid gap-4 py-4">
                  {/* Type Switcher */}
                  <div className="grid grid-cols-3 gap-2">
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
                    <Button
                      type="button"
                      variant={type === "TRANSFER" ? "default" : "outline"}
                      className={type === "TRANSFER" ? "bg-blue-600 hover:bg-blue-700 text-white" : ""}
                      onClick={() => setType("TRANSFER")}
                      disabled={isSubmitting}
                    >
                      Transf.
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

                  {type !== "TRANSFER" && (
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
                  )}

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="account" className="text-right">
                      {type === "TRANSFER" ? "Origem" : "Conta"}
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

                  {type === "TRANSFER" && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="destinationAccount" className="text-right">
                        Destino
                      </Label>
                      <div className="col-span-3">
                        <Select value={destinationAccountId} onValueChange={(v) => setDestinationAccountId(v || "")}>
                          <SelectTrigger id="destinationAccount">
                            <SelectValue placeholder="Selecione o destino..." />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts
                              .filter((a) => a.id !== accountId)
                              .map((a) => (
                                <SelectItem key={a.id} value={a.id}>
                                  {a.name} ({formatCurrency(a.balance)})
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="description" className="text-right">
                      Descrição
                    </Label>
                    <Input
                      id="description"
                      placeholder="Ex: Almoço, Salário, etc."
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
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
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

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Soma de todas as contas ativas
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Entradas no mês vigente</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Saídas no mês vigente</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Resultado do Mês</CardTitle>
            <div
              className={`h-2 w-2 rounded-full ${
                netSavings >= 0 ? "bg-emerald-500" : "bg-red-500"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                netSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {formatCurrency(netSavings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Diferença (Receitas - Despesas)</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Expense Pie Chart */}
      <ExpenseCategoryChart transactions={transactions} categories={categories} />

      {/* Accounts & Recent Activity Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Accounts List */}
        <Card className="lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Minhas Contas
            </CardTitle>
            <CardDescription>Saldos disponíveis por instituição</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma conta cadastrada.
              </p>
            ) : (
              accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: acc.color || "#820AD1" }}
                    />
                    <div>
                      <p className="text-sm font-medium text-foreground">{acc.name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{acc.type}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm">
                    {formatCurrency(acc.balance)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions List */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Últimas Transações
            </CardTitle>
            <CardDescription>Movimentações recentes registradas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhuma transação lançada até o momento.
              </p>
            ) : (
              transactions.slice(0, 6).map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center space-x-3 min-w-0 pr-2">
                    <div
                      className={`p-2 rounded-full shrink-0 ${
                        tx.type === "INCOME"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : tx.type === "EXPENSE"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-blue-500/10 text-blue-500"
                      }`}
                    >
                      {tx.type === "INCOME" ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : tx.type === "EXPENSE" ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowRightLeft className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {tx.description || tx.category?.name || "Sem descrição"}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDate(tx.transactionAt)}</span>
                        {tx.category?.name && (
                          <span className="inline-flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded text-[10px]">
                            <Tag className="h-3 w-3" />
                            {tx.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`font-semibold text-sm ${
                        tx.type === "INCOME"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : tx.type === "EXPENSE"
                          ? "text-red-600 dark:text-red-400"
                          : "text-blue-600 dark:text-blue-400"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
                      {formatCurrency(tx.amount)}
                    </span>

                    {deleteConfirmId === tx.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => handleDeleteTransaction(tx.id)}
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
                        size="xs"
                        variant="ghost"
                        className="text-muted-foreground hover:text-red-500"
                        onClick={() => setDeleteConfirmId(tx.id)}
                      >
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
