import React, { useState, useEffect, useCallback } from "react";
import { categoryService } from "@/lib/api/services";
import { ApiCategory } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FolderTree, PlusCircle, Trash2, Edit2, RefreshCw, AlertCircle, Tag } from "lucide-react";

export const CategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [color, setColor] = useState("#3b82f6");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Modal
  const [editingCategory, setEditingCategory] = useState<ApiCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  // Delete State
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await categoryService.findAll();
      setCategories(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao carregar categorias.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSubmitting(true);
    try {
      await categoryService.create({
        name,
        type,
        color: color || undefined,
      });
      setName("");
      setType("EXPENSE");
      setIsCreateOpen(false);
      await loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao criar categoria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (cat: ApiCategory) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditColor(cat.color || "#3b82f6");
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName) return;
    setIsSubmitting(true);
    try {
      await categoryService.update(editingCategory.id, {
        name: editName,
        color: editColor || undefined,
      });
      setEditingCategory(null);
      await loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao editar categoria.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await categoryService.deactivate(id);
      setDeleteConfirmId(null);
      await loadCategories();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao desativar categoria.");
    }
  };

  const incomeCategories = categories.filter((c) => c.type === "INCOME");
  const expenseCategories = categories.filter((c) => c.type === "EXPENSE");

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 min-w-0 pb-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Categorias</h1>
          <p className="text-muted-foreground text-sm">
            Organize suas transações por grupos e tags personalizadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCategories} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger render={
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Categoria / Add Category
              </Button>
            } />
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Criar Categoria</DialogTitle>
                <DialogDescription>Cadastre uma nova categoria de despesa ou receita.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cat-name">Nome da Categoria</Label>
                    <Input
                      id="cat-name"
                      placeholder="Ex: Alimentação, Lazer, Transporte"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cat-type">Tipo</Label>
                    <Select
                      value={type}
                      onValueChange={(val) => val && setType(val as "INCOME" | "EXPENSE")}
                      items={[
                        { label: "Despesa", value: "EXPENSE" },
                        { label: "Receita", value: "INCOME" }
                      ]}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EXPENSE">Despesa</SelectItem>
                        <SelectItem value="INCOME">Receita</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="cat-color">Cor de Identificação</Label>
                    <Input
                      id="cat-color"
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="h-10 cursor-pointer"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? "Criando..." : "Cadastrar Categoria"}
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

      {/* Grid: Expense Categories & Income Categories */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-red-500" />
              Categorias de Despesas ({expenseCategories.length})
            </CardTitle>
            <CardDescription>Usadas para classificar seus custos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {expenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria de despesa.</p>
            ) : (
              expenseCategories.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || "#ef4444" }} />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    {c.isSystem && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Sistema</span>}
                  </div>
                  {!c.isSystem && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(c)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-emerald-500" />
              Categorias de Receitas ({incomeCategories.length})
            </CardTitle>
            <CardDescription>Usadas para classificar seus ganhos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {incomeCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma categoria de receita.</p>
            ) : (
              incomeCategories.map((c) => (
                <div key={c.id} className="flex items-center justify-between border-b pb-2.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color || "#10b981" }} />
                    <span className="text-sm font-medium text-foreground">{c.name}</span>
                    {c.isSystem && <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">Sistema</span>}
                  </div>
                  {!c.isSystem && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-primary" onClick={() => handleOpenEdit(c)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirmId(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Modal */}
      <Dialog open={editingCategory !== null} onOpenChange={(open) => { if (!open) setEditingCategory(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
            <DialogDescription>Altere o nome e cor da categoria.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-name">Nome</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-color">Cor</Label>
                <Input
                  id="edit-color"
                  type="color"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="h-10 cursor-pointer"
                />
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
            <DialogTitle>Desativar Categoria</DialogTitle>
            <DialogDescription>Tem certeza que deseja desativar esta categoria?</DialogDescription>
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
