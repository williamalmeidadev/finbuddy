import React, { useState } from "react";
import {
  useTransfers,
  useAccounts,
  useCreateTransfer,
  useDeleteTransfer,
} from "@/lib/queries";
import { ApiTransfer, ApiAccount } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRightLeft, PlusCircle, Trash2, Calendar, RefreshCw, AlertCircle, Search, Filter } from "lucide-react";

export const TransfersPage: React.FC = () => {
  const { data: transfers = [], isLoading: isTrLoading, error: trError, refetch: refetchTr } = useTransfers();
  const { data: accounts = [], isLoading: isAccLoading, refetch: refetchAcc } = useAccounts();

  const createTransfer = useCreateTransfer();
  const deleteTransfer = useDeleteTransfer();

  const isLoading = isTrLoading || isAccLoading;
  const error = trError ? (trError instanceof Error ? trError.message : "Erro ao carregar transferências.") : "";

  // Create modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [accountFilter, setAccountFilter] = useState("ALL");

  const handleRefresh = () => {
    refetchTr();
    refetchAcc();
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
    const effectiveFrom = fromAccountId || (accounts[0]?.id ?? "");
    const effectiveTo = toAccountId || (accounts[1]?.id ?? "");

    if (!amount || !effectiveFrom || !effectiveTo) return;
    if (effectiveFrom === effectiveTo) {
      alert("A conta de origem e destino não podem ser iguais.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createTransfer.mutateAsync({
        fromAccountId: effectiveFrom,
        toAccountId: effectiveTo,
        amount: parseFloat(amount),
        description: description || undefined,
      });
      setAmount("");
      setDescription("");
      setIsDialogOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao realizar transferência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTransfer.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao estornar transferência.");
    }
  };

  // Client-side search filtering
  const filteredTransfers = transfers.filter((tr) => {
    const matchesAccount =
      accountFilter === "ALL" ||
      tr.fromAccountId === accountFilter ||
      tr.toAccountId === accountFilter ||
      tr.fromAccount?.id === accountFilter ||
      tr.toAccount?.id === accountFilter;

    if (!matchesAccount) return false;
    if (!searchTerm) return true;

    const term = searchTerm.toLowerCase();
    const descMatch = tr.description?.toLowerCase().includes(term);
    const fromMatch = (tr.fromAccount?.name || tr.sourceAccount?.name)?.toLowerCase().includes(term);
    const toMatch = (tr.toAccount?.name || tr.destinationAccount?.name)?.toLowerCase().includes(term);
    return descMatch || fromMatch || toMatch;
  });

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transferências Entre Contas</h1>
          <p className="text-muted-foreground text-sm">
            Movimente saldo entre suas contas financeiras sem alterar o patrimônio líquido total.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button disabled={accounts.length < 2}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Transferência
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Transferir Entre Contas</DialogTitle>
                <DialogDescription>
                  Selecione as contas de origem e destino para realizar o lançamento.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="fromAccount" className="text-right">
                      Origem
                    </Label>
                    <div className="col-span-3">
                      <select
                        id="fromAccount"
                        value={fromAccountId || accounts[0]?.id || ""}
                        onChange={(e) => setFromAccountId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                        required
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatCurrency(a.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="toAccount" className="text-right">
                      Destino
                    </Label>
                    <div className="col-span-3">
                      <select
                        id="toAccount"
                        value={toAccountId || accounts[1]?.id || ""}
                        onChange={(e) => setToAccountId(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                        required
                      >
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({formatCurrency(a.balance)})
                          </option>
                        ))}
                      </select>
                    </div>
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
                    <Label htmlFor="description" className="text-right">
                      Descrição
                    </Label>
                    <Input
                      id="description"
                      placeholder="Ex: Reserva de emergência"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Transferindo..." : "Confirmar Transferência"}
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

      {accounts.length < 2 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>
            Você precisa ter pelo menos 2 contas ativas cadastradas para realizar transferências.
          </span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-3.5 md:px-4 md:py-3 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80 flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Buscar por descrição ou conta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">Filtrar por conta:</span>
            <Select value={accountFilter} onValueChange={(v) => setAccountFilter(v || "ALL")}>
              <SelectTrigger className="w-[170px] h-9">
                <SelectValue placeholder="Todas as Contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas as Contas</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transfers List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Histórico de Transferências</CardTitle>
          <CardDescription>
            Exibindo {filteredTransfers.length} de {transfers.length} transferências registradas entre contas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Carregando transferências...</div>
          ) : filteredTransfers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma transferência encontrada para os filtros selecionados.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransfers.map((tr) => (
                <div
                  key={tr.id}
                  className="flex items-center justify-between p-3.5 rounded-lg border bg-card hover:bg-accent/40 transition-colors"
                >
                  <div className="flex items-center space-x-3.5 min-w-0 pr-2">
                    <div className="p-2.5 rounded-full shrink-0 bg-blue-500/10 text-blue-500">
                      <ArrowRightLeft className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-medium text-sm text-foreground">
                        <span>{tr.fromAccount?.name || "Conta Origem"}</span>
                        <span className="text-muted-foreground font-normal">→</span>
                        <span>{tr.toAccount?.name || "Conta Destino"}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(tr.transferredAt || tr.createdAt)}
                        </span>
                        {tr.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[200px]">{tr.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="font-semibold text-base text-foreground">
                      {formatCurrency(tr.amount)}
                    </span>

                    {deleteConfirmId === tr.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          size="xs"
                          variant="destructive"
                          onClick={() => handleDelete(tr.id)}
                          disabled={deleteTransfer.isPending}
                        >
                          Confirmar
                        </Button>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={() => setDeleteConfirmId(null)}
                          disabled={deleteTransfer.isPending}
                        >
                          X
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-red-500 h-8 w-8"
                        onClick={() => setDeleteConfirmId(tr.id)}
                        title="Estornar transferência"
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
    </div>
  );
};

export default TransfersPage;
