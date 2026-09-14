import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X, Loader2 } from "lucide-react";
import { accountService, categoryService, transactionService, transferService } from "@/lib/api/services";

export interface ConfirmationCardProps {
  confirmationId?: string;
  id?: string;
  tool?: string;
  toolName?: string;
  riskLevel?: "LOW" | "MEDIUM" | "HIGH";
  parameters?: Record<string, unknown>;
  action?: Record<string, unknown>;
  expiresAt?: string;
  status?: "pending" | "confirmed" | "cancelled" | "executing" | "expired";
  onConfirm?: (confirmationId: string) => void;
  onCancel?: (confirmationId: string) => void;
  isSubmitting?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  create_transaction: "Criar Transação",
  update_transaction: "Atualizar Transação",
  delete_transaction: "Excluir Transação",
  create_transfer: "Criar Transferência",
  update_transfer: "Atualizar Transferência",
  delete_transfer: "Excluir Transferência",
  create_category: "Criar Categoria",
};

const FIELD_LABELS: Record<string, string> = {
  type: "Tipo",
  amount: "Valor",
  description: "Descrição",
  accountName: "Conta",
  fromAccountName: "Conta de Origem",
  toAccountName: "Conta de Destino",
  categoryName: "Categoria",
  transactionAt: "Data",
  transferredAt: "Data de Transferência",
  name: "Nome",
  color: "Cor",
  icon: "Ícone",
};

const HIDDEN_KEYS = new Set([
  "accountId",
  "categoryId",
  "transactionId",
  "transferId",
  "fromAccountId",
  "toAccountId",
  "userId",
  "requestId",
  "aiRequestId",
  "id",
]);

export function ConfirmationCard({
  confirmationId,
  id,
  tool,
  toolName,
  parameters,
  action,
  expiresAt,
  status = "pending",
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ConfirmationCardProps) {
  const effectiveId = confirmationId || id || "";
  const rawTool = toolName || tool || "Ação Financeira";
  const displayTool = TOOL_LABELS[rawTool] || rawTool;
  const effectiveParams = action || parameters || {};

  const isConfirmed = status === "confirmed";
  const isCancelled = status === "cancelled";
  const isExpired = status === "expired";
  const isExecuting = isSubmitting || status === "executing";
  const isCompleted = isConfirmed || isCancelled || isExpired;

  const [resolvedAccount, setResolvedAccount] = React.useState<string | null>(null);
  const [resolvedFromAccount, setResolvedFromAccount] = React.useState<string | null>(null);
  const [resolvedToAccount, setResolvedToAccount] = React.useState<string | null>(null);
  const [resolvedCategory, setResolvedCategory] = React.useState<string | null>(null);
  const [resolvedTxDetails, setResolvedTxDetails] = React.useState<{
    type?: string;
    amount?: number;
    description?: string;
    transactionAt?: string;
    accountName?: string;
    categoryName?: string;
    fromAccountName?: string;
    toAccountName?: string;
  } | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const params = effectiveParams as Record<string, unknown>;

    const accountId = typeof params.accountId === "string" ? params.accountId : undefined;
    const fromAccountId = typeof params.fromAccountId === "string" ? params.fromAccountId : undefined;
    const toAccountId = typeof params.toAccountId === "string" ? params.toAccountId : undefined;
    const categoryId = typeof params.categoryId === "string" ? params.categoryId : undefined;

    const accountName = typeof params.accountName === "string" ? params.accountName : undefined;
    const fromAccountName = typeof params.fromAccountName === "string" ? params.fromAccountName : undefined;
    const toAccountName = typeof params.toAccountName === "string" ? params.toAccountName : undefined;
    const categoryName = typeof params.categoryName === "string" ? params.categoryName : undefined;

    const transactionId = typeof params.transactionId === "string" ? params.transactionId : undefined;
    const transferId = typeof params.transferId === "string" ? params.transferId : undefined;
    const hasDetails = params.amount !== undefined || params.description !== undefined || params.name !== undefined;

    // Load target item details for deletion/updates if details are not provided directly
    if ((transactionId || transferId) && !hasDetails) {
      async function loadItemDetails() {
        try {
          if (transactionId) {
            const tx = await transactionService.findOne(transactionId).catch(() => null);
            if (tx && isMounted) {
              setResolvedTxDetails({
                type: tx.type,
                amount: tx.amount,
                description: tx.description ?? undefined,
                transactionAt: tx.transactionAt,
                accountName: tx.account?.name,
                categoryName: tx.category?.name,
              });
            }
          } else if (transferId) {
            const tr = await transferService.findOne(transferId).catch(() => null);
            if (tr && isMounted) {
              setResolvedTxDetails({
                amount: tr.amount,
                description: tr.description ?? undefined,
                transactionAt: tr.transferredAt || tr.transactionAt,
                fromAccountName: tr.fromAccount?.name || tr.sourceAccount?.name,
                toAccountName: tr.toAccount?.name || tr.destinationAccount?.name,
              });
            }
          }
        } catch {
          // Fallback gracefully
        }
      }
      loadItemDetails();
    }

    const needAccounts = (!accountName && accountId) || (!fromAccountName && fromAccountId) || (!toAccountName && toAccountId);
    const needCategories = !categoryName && categoryId;

    if (!needAccounts && !needCategories) return;

    async function loadNames() {
      try {
        const [accounts, categories] = await Promise.all([
          needAccounts ? accountService.findAll().catch(() => []) : Promise.resolve([]),
          needCategories ? categoryService.findAll().catch(() => []) : Promise.resolve([]),
        ]);

        if (!isMounted) return;

        if (accountId && !accountName) {
          const acc = accounts.find((a) => a.id === accountId);
          if (acc) setResolvedAccount(acc.name);
        }
        if (fromAccountId && !fromAccountName) {
          const acc = accounts.find((a) => a.id === fromAccountId);
          if (acc) setResolvedFromAccount(acc.name);
        }
        if (toAccountId && !toAccountName) {
          const acc = accounts.find((a) => a.id === toAccountId);
          if (acc) setResolvedToAccount(acc.name);
        }
        if (categoryId && !categoryName) {
          const cat = categories.find((c) => c.id === categoryId);
          if (cat) setResolvedCategory(cat.name);
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadNames();

    return () => {
      isMounted = false;
    };
  }, [effectiveParams]);

  const formatParamValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return "-";
    if (key === "amount" && typeof value === "number") {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
    }
    if (key === "type" && typeof value === "string") {
      return value === "EXPENSE" ? "Despesa" : value === "INCOME" ? "Receita" : value;
    }
    if ((key === "transactionAt" || key === "transferredAt") && typeof value === "string") {
      try {
        return new Date(value).toLocaleDateString("pt-BR");
      } catch {
        return String(value);
      }
    }
    if (typeof value === "object") {
      return JSON.stringify(value);
    }
    return String(value);
  };

  const rawParams = {
    ...(resolvedTxDetails || {}),
    ...effectiveParams,
  } as Record<string, unknown>;

  if (resolvedTxDetails) {
    if (!rawParams.type && resolvedTxDetails.type) rawParams.type = resolvedTxDetails.type;
    if (!rawParams.amount && resolvedTxDetails.amount) rawParams.amount = resolvedTxDetails.amount;
    if (!rawParams.description && resolvedTxDetails.description) rawParams.description = resolvedTxDetails.description;
    if (!rawParams.transactionAt && resolvedTxDetails.transactionAt) rawParams.transactionAt = resolvedTxDetails.transactionAt;
    if (!rawParams.accountName && resolvedTxDetails.accountName) rawParams.accountName = resolvedTxDetails.accountName;
    if (!rawParams.categoryName && resolvedTxDetails.categoryName) rawParams.categoryName = resolvedTxDetails.categoryName;
    if (!rawParams.fromAccountName && resolvedTxDetails.fromAccountName) rawParams.fromAccountName = resolvedTxDetails.fromAccountName;
    if (!rawParams.toAccountName && resolvedTxDetails.toAccountName) rawParams.toAccountName = resolvedTxDetails.toAccountName;
  }

  if (!rawParams.accountName && resolvedAccount) {
    rawParams.accountName = resolvedAccount;
  }
  if (!rawParams.fromAccountName && resolvedFromAccount) {
    rawParams.fromAccountName = resolvedFromAccount;
  }
  if (!rawParams.toAccountName && resolvedToAccount) {
    rawParams.toAccountName = resolvedToAccount;
  }
  if (!rawParams.categoryName && resolvedCategory) {
    rawParams.categoryName = resolvedCategory;
  }

  const PRIORITY_KEYS = [
    "type",
    "amount",
    "description",
    "accountName",
    "fromAccountName",
    "toAccountName",
    "categoryName",
    "transactionAt",
    "transferredAt",
    "name",
    "color",
    "icon",
  ];

  const keysPresent = new Set(
    Object.keys(rawParams).filter(
      (k) => !HIDDEN_KEYS.has(k) && rawParams[k] !== undefined && rawParams[k] !== null
    )
  );

  const paramEntries: Array<[string, unknown]> = [];

  for (const key of PRIORITY_KEYS) {
    if (keysPresent.has(key)) {
      paramEntries.push([key, rawParams[key]]);
      keysPresent.delete(key);
    }
  }

  for (const key of keysPresent) {
    paramEntries.push([key, rawParams[key]]);
  }

  return (
    <Card className={`shadow-sm my-2 border transition-colors ${
      isConfirmed
        ? "border-emerald-200 bg-emerald-50/40 dark:border-emerald-900/50 dark:bg-emerald-950/20"
        : isCancelled || isExpired
          ? "border-muted bg-muted/30 dark:bg-muted/10 opacity-75"
          : "border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20"
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isConfirmed ? (
              <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            ) : isCancelled || isExpired ? (
              <X className="h-5 w-5 text-muted-foreground" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            )}
            <CardTitle className="text-sm font-semibold">
              {isConfirmed
                ? "Operação Confirmada"
                : isCancelled
                  ? "Operação Cancelada"
                  : isExpired
                    ? "Operação Expirada"
                    : "Confirmação Necessária"}
            </CardTitle>
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
            isConfirmed
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
              : isCancelled || isExpired
                ? "bg-muted text-muted-foreground"
                : isExecuting
                  ? "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200 animate-pulse"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
          }`}>
            {isConfirmed
              ? "Confirmado"
              : isCancelled
                ? "Cancelado"
                : isExpired
                  ? "Expirado"
                  : isExecuting
                    ? "Processando"
                    : "Pendente"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 text-xs">
        <div className="flex justify-between text-muted-foreground border-b pb-2">
          <span>Ação: <strong className="text-foreground font-semibold">{displayTool}</strong></span>
        </div>

        {paramEntries.length > 0 ? (
          <div className="rounded-md bg-background/80 p-2.5 border space-y-1.5">
            {paramEntries.map(([key, val]) => (
              <div key={key} className="flex items-start justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground shrink-0 font-medium">
                  {FIELD_LABELS[key] || key}:
                </span>
                <span className="text-foreground font-semibold text-right break-all">
                  {formatParamValue(key, val)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md bg-background/80 p-2.5 border text-xs text-muted-foreground italic">
            Operação em registro financeiro.
          </div>
        )}

        {expiresAt && !isCompleted && (
          <p className="text-[11px] text-muted-foreground">
            Expira às: {new Date(expiresAt).toLocaleTimeString("pt-BR")}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex justify-end gap-2 pt-1 pb-3">
        {isExecuting ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            <span>Processando solicitação...</span>
          </div>
        ) : isConfirmed ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <Check className="h-4 w-4" />
            <span>Ação realizada com sucesso</span>
          </div>
        ) : isCancelled ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <X className="h-4 w-4" />
            <span>Solicitação descartada</span>
          </div>
        ) : isExpired ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
            <AlertCircle className="h-4 w-4" />
            <span>Solicitação expirada</span>
          </div>
        ) : (
          <>
            {onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCancel(effectiveId)}
                disabled={isExecuting || !effectiveId}
              >
                <X className="mr-1 h-3.5 w-3.5" /> Cancelar
              </Button>
            )}
            {onConfirm && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onConfirm(effectiveId)}
                disabled={isExecuting || !effectiveId}
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Confirmar Ação
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
