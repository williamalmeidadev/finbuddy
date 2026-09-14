import React, { useState, useEffect, useCallback } from "react";
import { transferService, accountService } from "@/lib/api/services";
import { ApiTransfer, ApiAccount } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowRightLeft, PlusCircle, Trash2, Calendar, RefreshCw, AlertCircle } from "lucide-react";

export const TransfersPage: React.FC = () => {
  const [transfers, setTransfers] = useState<ApiTransfer[]>([]);
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Create modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete modal state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const [trRes, accRes] = await Promise.all([
        transferService.findAll(),
        accountService.findAll(),
      ]);
      setTransfers(trRes);
      setAccounts(accRes);
      if (accRes.length >= 2) {
        setFromAccountId((prev) => prev || accRes[0].id);
        setToAccountId((prev) => prev || accRes[1].id);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar transferências.");
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      }) + " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalFrom = fromAccountId || (accounts.length > 0 ? accounts[0].id : "");
    const finalTo = toAccountId || (accounts.length > 1 ? accounts[1].id : "");
    if (!finalFrom || !finalTo || !amount) return;
    if (finalFrom === finalTo) {
      alert("A conta de origem deve ser diferente da conta de destino.");
      return;
    }
    setIsSubmitting(true);
    try {
      await transferService.create({
        fromAccountId: finalFrom,
        toAccountId: finalTo,
        amount: parseFloat(amount),
        description: description || "Transferência entre contas",
      });
      setAmount("");
      setDescription("");
      setIsDialogOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao criar transferência.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await transferService.delete(id);
      setDeleteConfirmId(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir transferência.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transferências</h1>
          <p className="text-muted-foreground text-sm">
            Movimente recursos de forma segura entre suas contas bancárias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Transfer / Nova Transferência
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Transferência Entre Contas</DialogTitle>
                <DialogDescription>Mova valores entre suas contas cadastradas.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tr-from">Conta Origem</Label>
                    <select
                      id="tr-from"
                      className="w-full p-2 border rounded-md bg-background text-sm"
                      value={fromAccountId}
                      onChange={(e) => setFromAccountId(e.target.value)}
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tr-to">Conta Destino</Label>
                    <select
                      id="tr-to"
                      className="w-full p-2 border rounded-md bg-background text-sm"
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                    >
                      {accounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({formatCurrency(acc.balance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tr-amount">Valor (R$)</Label>
                    <Input
                      id="tr-amount"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="tr-desc">Observação / Descrição</Label>
                    <Input
                      id="tr-desc"
                      placeholder="Ex: Aporte na poupança"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Efetuando..." : "Confirmar Transferência"}
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

      {/* Transfers List */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Transferências</CardTitle>
          <CardDescription>Movimentações entre contas próprias.</CardDescription>
        </CardHeader>
        <CardContent>
          {transfers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
              <AlertCircle className="h-8 w-8 mb-2 stroke-1" />
              Nenhuma transferência cadastrada.
            </div>
          ) : (
            <div className="space-y-4">
              {transfers.map((tr) => {
                const fromAccName = tr.sourceAccount?.name || tr.fromAccount?.name || accounts.find((a) => a.id === (tr.fromAccountId || tr.sourceAccountId))?.name || "Origem";
                const toAccName = tr.destinationAccount?.name || tr.toAccount?.name || accounts.find((a) => a.id === (tr.toAccountId || tr.destinationAccountId))?.name || "Destino";

                return (
                  <div key={tr.id} className="flex items-center justify-between border-b pb-3.5 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-blue-500/10 text-blue-600">
                        <ArrowRightLeft className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {fromAccName} ➔ {toAccName}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{tr.description || "Transferência entre contas"}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3 inline" />
                            {formatDate(tr.transferredAt || tr.transactionAt || tr.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(tr.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Delete Transfer"
                        className="text-xs text-muted-foreground hover:text-destructive h-8 px-2"
                        onClick={() => setDeleteConfirmId(tr.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Excluir Transferência</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja estornar e excluir esta transferência? Os saldos das duas contas serão ajustados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Confirm Delete / Estornar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
