import React, { useState, useEffect, useCallback } from "react";
import { accountService } from "@/lib/api/services";
import { ApiAccount } from "@/lib/api/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Landmark,
  CreditCard,
  Banknote,
  PiggyBank,
  PlusCircle,
  Trash2,
  AlertTriangle,
  Edit2,
  RefreshCw,
  Power,
} from "lucide-react";

type AccountTypeUI = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH";

export const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<ApiAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Add Account Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountTypeUI>("CHECKING");
  const [balance, setBalance] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Account State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ApiAccount | null>(null);
  const [editName, setEditName] = useState("");
  const [editType, setEditType] = useState<AccountTypeUI>("CHECKING");
  const [editIsActive, setEditIsActive] = useState<boolean>(true);

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadAccounts = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await accountService.findAll();
      setAccounts(data);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar contas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const getAccountIcon = (accType: string) => {
    switch (accType) {
      case "CHECKING":
        return <Landmark className="h-6 w-6 text-white" />;
      case "SAVINGS":
        return <PiggyBank className="h-6 w-6 text-white" />;
      case "CREDIT_CARD":
        return <CreditCard className="h-6 w-6 text-white" />;
      case "CASH":
        return <Banknote className="h-6 w-6 text-white" />;
      default:
        return <Wallet className="h-6 w-6 text-white" />;
    }
  };

  const getAccountTypeName = (accType: string) => {
    switch (accType) {
      case "CHECKING":
        return "Conta Corrente";
      case "SAVINGS":
        return "Conta Poupança";
      case "CREDIT_CARD":
        return "Cartão de Crédito";
      case "CASH":
        return "Dinheiro";
      case "INVESTMENT":
        return "Investimentos";
      default:
        return accType;
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSubmitting(true);
    try {
      await accountService.create({
        name,
        type,
        balance: balance ? parseFloat(balance) : 0,
      });
      setName("");
      setBalance("");
      setType("CHECKING");
      setIsDialogOpen(false);
      await loadAccounts();
    } catch (err: any) {
      alert(err?.message || "Erro ao criar conta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (acc: ApiAccount) => {
    setEditingAccount(acc);
    setEditName(acc.name);
    setEditType(acc.type as AccountTypeUI);
    setEditIsActive(acc.isActive);
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount || !editName) return;
    setIsSubmitting(true);
    try {
      await accountService.update(editingAccount.id, {
        name: editName,
        type: editType,
        isActive: editIsActive,
      });
      setIsEditOpen(false);
      setEditingAccount(null);
      await loadAccounts();
    } catch (err: any) {
      alert(err?.message || "Erro ao atualizar conta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await accountService.delete(id);
      setDeleteConfirmId(null);
      await loadAccounts();
    } catch (err: any) {
      alert(err?.message || "Erro ao desativar conta.");
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await accountService.update(id, { isActive: true });
      await loadAccounts();
    } catch (err: any) {
      alert(err?.message || "Erro ao reativar conta.");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Minhas Contas</h1>
          <p className="text-muted-foreground text-sm">
            Gerencie suas contas bancárias, investimentos e saldos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadAccounts} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Account / Adicionar Conta
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nova Conta Bancária</DialogTitle>
                <DialogDescription>Cadastre uma nova conta para gerenciar seu saldo.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="acc-name">Nome da Conta</Label>
                    <Input
                      id="acc-name"
                      placeholder="Ex: Nubank, Itaú, Carteira"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="acc-type">Tipo de Conta</Label>
                    <select
                      id="acc-type"
                      className="w-full p-2 border rounded-md bg-background text-sm"
                      value={type}
                      onChange={(e) => setType(e.target.value as AccountTypeUI)}
                    >
                      <option value="CHECKING">Conta Corrente (CHECKING)</option>
                      <option value="SAVINGS">Conta Poupança (SAVINGS)</option>
                      <option value="CREDIT_CARD">Cartão de Crédito (CREDIT_CARD)</option>
                      <option value="CASH">Dinheiro (CASH)</option>
                      <option value="INVESTMENT">Investimentos (INVESTMENT)</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="acc-balance">Saldo Inicial (R$)</Label>
                    <Input
                      id="acc-balance"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Criando..." : "Cadastrar Conta"}
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

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-card text-center text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mb-3 stroke-1 text-amber-500" />
          <p className="font-semibold text-lg">Nenhuma conta cadastrada</p>
          <p className="text-sm mt-1 mb-4">Adicione sua primeira conta para poder lançar transações.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className="relative overflow-hidden border border-muted/80 shadow-md">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-primary" />
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-bold">{acc.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-0.5">
                    <CardDescription className="text-xs font-semibold uppercase text-muted-foreground">
                      {getAccountTypeName(acc.type)}
                    </CardDescription>
                    <Badge
                      variant={acc.isActive ? "outline" : "destructive"}
                      className={
                        acc.isActive
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px] px-2 py-0.5"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-[10px] px-2 py-0.5"
                      }
                    >
                      {acc.isActive ? "Ativa" : "Desativada (Inactive)"}
                    </Badge>
                  </div>
                </div>
                <div className={`p-2.5 rounded-xl ${acc.isActive ? "bg-primary" : "bg-muted-foreground/40"} shadow-sm`}>
                  {getAccountIcon(acc.type)}
                </div>
              </CardHeader>

              <CardContent className="space-y-3 pb-4">
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Saldo Atual</span>
                  <h3 className={`text-2xl font-extrabold tracking-tight ${acc.balance < 0 ? "text-red-500" : "text-foreground"}`}>
                    {formatCurrency(acc.balance)}
                  </h3>
                </div>
              </CardContent>

              <CardFooter className="border-t bg-muted/20 px-6 py-3 flex justify-between items-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary h-8 px-2 flex items-center gap-1.5"
                  onClick={() => handleOpenEdit(acc)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Edit / Editar
                </Button>
                {acc.isActive ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive h-8 px-2 flex items-center gap-1.5"
                    onClick={() => setDeleteConfirmId(acc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Deactivate / Desativar
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2 flex items-center gap-1.5 font-semibold"
                    onClick={() => handleReactivate(acc.id)}
                  >
                    <Power className="h-3.5 w-3.5" />
                    Reactivate / Reativar
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>Altere as informações da conta bancária.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-acc-name">Nome da Conta</Label>
                <Input
                  id="edit-acc-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-acc-type">Tipo</Label>
                <select
                  id="edit-acc-type"
                  className="w-full p-2 border rounded-md bg-background text-sm"
                  value={editType}
                  onChange={(e) => setEditType(e.target.value as AccountTypeUI)}
                >
                  <option value="CHECKING">Conta Corrente (CHECKING)</option>
                  <option value="SAVINGS">Conta Poupança (SAVINGS)</option>
                  <option value="CREDIT_CARD">Cartão de Crédito (CREDIT_CARD)</option>
                  <option value="CASH">Dinheiro (CASH)</option>
                  <option value="INVESTMENT">Investimentos (INVESTMENT)</option>
                </select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-acc-status">Status da Conta</Label>
                <select
                  id="edit-acc-status"
                  className="w-full p-2 border rounded-md bg-background text-sm font-medium"
                  value={editIsActive ? "active" : "inactive"}
                  onChange={(e) => setEditIsActive(e.target.value === "active")}
                >
                  <option value="active">Ativa</option>
                  <option value="inactive">Desativada / Inativa</option>
                </select>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Desativar Conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja desativar esta conta?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 justify-end mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Confirm Delete / Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
