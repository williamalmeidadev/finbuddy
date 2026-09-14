import React, { useState, useEffect, useCallback } from "react";
import {
  financialSummaryService,
  accountService,
  transactionService,
  categoryService,
  transferService,
} from "@/lib/api/services";
import {
  ApiFinancialSummary,
  ApiAccount,
  ApiTransaction,
  ApiCategory,
} from "@/lib/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [summary, setSummary] = useState<ApiFinancialSummary | null>(null);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [transactions, setTransactions] = useState<ApiTransaction[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [sumRes, accRes, txRes, catRes] = await Promise.all([
        financialSummaryService.getSummary().catch(() => null),
        accountService.findAll().catch(() => []),
        transactionService.findAll().catch(() => []),
        categoryService.findAll().catch(() => []),
      ]);

      setSummary(sumRes);
      setAccounts(accRes);
      setTransactions(txRes);
      setCategories(catRes);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar dados do dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        await transferService.create({
          fromAccountId: accountId,
          toAccountId: destinationAccountId,
          amount: parseFloat(amount),
          description: description || "Transferência entre contas",
          transferredAt: new Date(txDate).toISOString(),
        });
      } else {
        await transactionService.create({
          accountId,
          categoryId: categoryId || undefined,
          amount: parseFloat(amount),
          type: type as "INCOME" | "EXPENSE",
          description: description || undefined,
          transactionAt: new Date(txDate).toISOString(),
        });
      }

      // Reset Form & reload
      setDescription("");
      setAmount("");
      setAccountId("");
      setCategoryId("");
      setDestinationAccountId("");
      setIsDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao criar transação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    try {
      await transactionService.delete(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir transação.");
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
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
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
                      className={`text-xs ${type === "EXPENSE" ? "bg-red-500 hover:bg-red-600 text-white" : ""}`}
                      onClick={() => { setType("EXPENSE"); setCategoryId(""); }}
                    >
                      Despesa
                    </Button>
                    <Button
                      type="button"
                      variant={type === "INCOME" ? "default" : "outline"}
                      className={`text-xs ${type === "INCOME" ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}`}
                      onClick={() => { setType("INCOME"); setCategoryId(""); }}
                    >
                      Receita
                    </Button>
                    <Button
                      type="button"
                      variant={type === "TRANSFER" ? "default" : "outline"}
                      className={`text-xs ${type === "TRANSFER" ? "bg-blue-500 hover:bg-blue-600 text-white" : ""}`}
                      onClick={() => { setType("TRANSFER"); setCategoryId(""); }}
                    >
                      Transferir
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="desc">Descrição</Label>
                    <Input
                      id="desc"
                      placeholder="Ex: Mercado, Salário, etc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="val">Valor (R$)</Label>
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
                    <Label htmlFor="acc">
                      {type === "TRANSFER" ? "Conta de Origem" : "Conta"}
                    </Label>
                    <Select
                      value={accountId}
                      onValueChange={(val) => setAccountId(val || "")}
                      items={accounts.map(acc => ({ label: `${acc.name} (${formatCurrency(acc.balance)})`, value: acc.id }))}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a conta" />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({formatCurrency(acc.balance)})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {type === "TRANSFER" && (
                    <div className="grid gap-2">
                      <Label htmlFor="destAcc">Conta de Destino</Label>
                      <Select
                        value={destinationAccountId}
                        onValueChange={(val) => setDestinationAccountId(val || "")}
                        items={accounts.filter(acc => acc.id !== accountId).map(acc => ({ label: `${acc.name} (${formatCurrency(acc.balance)})`, value: acc.id }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o destino" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts
                            .filter((acc) => acc.id !== accountId)
                            .map((acc) => (
                              <SelectItem key={acc.id} value={acc.id}>
                                {acc.name} ({formatCurrency(acc.balance)})
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {type !== "TRANSFER" && (
                    <div className="grid gap-2">
                      <Label htmlFor="cat">Categoria</Label>
                      <Select
                        value={categoryId}
                        onValueChange={(val) => setCategoryId(val || "")}
                        items={categories.filter(c => c.type === type).map(cat => ({ label: cat.name, value: cat.id }))}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories
                            .filter((c) => c.type === type)
                            .map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo Total Consolidação / Total Net Worth</CardTitle>
            <div className="p-2 bg-primary/10 text-primary rounded-md">
              <Wallet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">Soma de todas as contas ativas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receitas do Mês</CardTitle>
            <div className="p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-md">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(monthlyIncome)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Entradas registradas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Despesas do Mês</CardTitle>
            <div className="p-2 bg-red-500/10 text-red-600 dark:text-red-400 rounded-md">
              <TrendingDown className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              -{formatCurrency(monthlyExpenses)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Saídas registradas</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resultado Líquido</CardTitle>
            <div className={`p-2 rounded-md ${netSavings >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
              <ArrowRightLeft className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netSavings >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {formatCurrency(netSavings)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Balanço do mês atual</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Category Pie Chart */}
      <ExpenseCategoryChart transactions={transactions} categories={categories} />

      {/* Main Grid: Accounts & Recent Transactions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-1 md:col-span-2 lg:col-span-3 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Saldos por Conta</CardTitle>
            <CardDescription>Resumo das suas contas bancárias e carteiras.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conta cadastrada.</p>
            ) : (
              accounts.map((acc) => (
                <div key={acc.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold">{acc.name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{acc.type}</p>
                  </div>
                  <span className={`text-sm font-bold ${acc.balance < 0 ? "text-red-500" : "text-foreground"}`}>
                    {formatCurrency(acc.balance)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="col-span-1 md:col-span-2 lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Lançamentos Recentes</CardTitle>
            <CardDescription>Últimas movimentações registradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                <AlertCircle className="h-8 w-8 mb-2 stroke-1" />
                Nenhuma transação cadastrada.
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.slice(0, 6).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${tx.type === "INCOME" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"}`}>
                        {tx.type === "INCOME" ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{tx.description || (tx.type === "INCOME" ? "Receita" : "Despesa")}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {tx.category && <span className="flex items-center gap-1"><Tag className="h-3 w-3" />{tx.category.name}</span>}
                          <span>•</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(tx.transactionAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-bold ${tx.type === "INCOME" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                        {tx.type === "INCOME" ? "+" : "-"}{formatCurrency(tx.amount)}
                      </span>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-destructive h-8 px-2" onClick={() => setDeleteConfirmId(tx.id)}>
                        Excluir
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Transação</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir esta transação?</DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteTransaction(deleteConfirmId)}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
