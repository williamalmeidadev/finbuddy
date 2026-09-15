import React, { useState } from "react";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  useDeleteAccount,
} from "@/lib/queries";
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
} from "lucide-react";

type AccountTypeUI = "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH";

export const AccountsPage: React.FC = () => {
  const { data: accounts = [], isLoading, error: queryError, refetch } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();

  const error = queryError ? (queryError instanceof Error ? queryError.message : "Erro ao carregar contas.") : "";

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
      await createAccount.mutateAsync({
        name,
        type,
        balance: balance ? parseFloat(balance) : 0,
      });
      setName("");
      setBalance("");
      setType("CHECKING");
      setIsDialogOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao criar conta.");
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
      await updateAccount.mutateAsync({
        id: editingAccount.id,
        dto: {
          name: editName,
          type: editType,
          isActive: editIsActive,
        },
      });
      setIsEditOpen(false);
      setEditingAccount(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao atualizar conta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAccount.mutateAsync(id);
      setDeleteConfirmId(null);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir conta.");
    }
  };

  const totalBalance = accounts.reduce((acc, a) => acc + (a.balance || 0), 0);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Gerenciamento de Contas</h1>
          <p className="text-muted-foreground text-sm">
            Cadastre suas contas bancárias, cartões e fontes de recurso.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger render={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Cadastrar Nova Conta</DialogTitle>
                <DialogDescription>
                  Informe os dados da sua instituição bancária ou conta financeira.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Nome
                    </Label>
                    <Input
                      id="name"
                      placeholder="Ex: Nubank, Itaú, Carteira"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="col-span-3"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="type" className="text-right">
                      Tipo
                    </Label>
                    <div className="col-span-3">
                      <Select value={type} onValueChange={(v) => setType(v as AccountTypeUI)}>
                        <SelectTrigger id="type">
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                          <SelectItem value="SAVINGS">Conta Poupança</SelectItem>
                          <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                          <SelectItem value="INVESTMENT">Investimentos</SelectItem>
                          <SelectItem value="CASH">Dinheiro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="balance" className="text-right">
                      Saldo Inicial
                    </Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSubmitting}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Salvando..." : "Salvar Conta"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Card */}
      <Card className="shadow-sm bg-primary/5 border-primary/20">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3.5 rounded-2xl bg-primary/10 text-primary shrink-0 flex items-center justify-center shadow-2xs">
              <Wallet className="h-8 w-8 text-primary" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Saldo Consolidado Total
              </p>
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight mt-0.5">
                {formatCurrency(totalBalance)}
              </h2>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando contas...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-card p-8">
          <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
          <h3 className="font-semibold text-lg">Nenhuma conta cadastrada</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            Cadastre sua primeira conta para começar a organizar suas finanças.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Cadastrar Minha Primeira Conta
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((acc) => (
            <Card key={acc.id} className="shadow-sm flex flex-col justify-between overflow-hidden">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg font-bold">{acc.name}</CardTitle>
                    {!acc.isActive && (
                      <Badge variant="secondary" className="text-[10px]">Inativa</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs">
                    {getAccountTypeName(acc.type)}
                  </CardDescription>
                </div>

                <div
                  className="p-2.5 rounded-xl shadow-xs shrink-0"
                  style={{ backgroundColor: acc.color || "#820AD1" }}
                >
                  {getAccountIcon(acc.type)}
                </div>
              </CardHeader>

              <CardContent className="pt-4">
                <div className="text-xs text-muted-foreground uppercase font-medium">Saldo Atual</div>
                <div className="text-2xl font-bold text-foreground mt-0.5">
                  {formatCurrency(acc.balance)}
                </div>
              </CardContent>

              <CardFooter className="py-3 border-t bg-muted/20 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenEdit(acc)}
                  className="text-xs"
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  Editar
                </Button>

                {deleteConfirmId === acc.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      size="xs"
                      variant="destructive"
                      onClick={() => handleDelete(acc.id)}
                      disabled={deleteAccount.isPending}
                    >
                      {deleteAccount.isPending ? "Excluindo..." : "Confirmar"}
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(null)}
                      disabled={deleteAccount.isPending}
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-red-500"
                    onClick={() => setDeleteConfirmId(acc.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Excluir
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Account Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Conta</DialogTitle>
            <DialogDescription>Atualize os dados da sua conta financeira.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-name" className="text-right">
                  Nome
                </Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-type" className="text-right">
                  Tipo
                </Label>
                <div className="col-span-3">
                  <Select value={editType} onValueChange={(v) => setEditType(v as AccountTypeUI)}>
                    <SelectTrigger id="edit-type">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CHECKING">Conta Corrente</SelectItem>
                      <SelectItem value="SAVINGS">Conta Poupança</SelectItem>
                      <SelectItem value="CREDIT_CARD">Cartão de Crédito</SelectItem>
                      <SelectItem value="INVESTMENT">Investimentos</SelectItem>
                      <SelectItem value="CASH">Dinheiro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <div className="col-span-3">
                  <Select
                    value={editIsActive ? "active" : "inactive"}
                    onValueChange={(v) => setEditIsActive(v === "active")}
                  >
                    <SelectTrigger id="edit-status">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativa</SelectItem>
                      <SelectItem value="inactive">Inativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} disabled={isSubmitting}>
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

export default AccountsPage;
