import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X, Loader2 } from "lucide-react";

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
  amount: "Valor",
  type: "Tipo",
  description: "Descrição",
  transactionAt: "Data",
  name: "Nome",
  color: "Cor",
  icon: "Ícone",
  transferredAt: "Data de Transferência",
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

  const paramEntries = Object.entries(effectiveParams).filter(
    ([key]) => !HIDDEN_KEYS.has(key)
  );

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
          <div className="rounded-md bg-background/80 p-2.5 font-mono border text-[11px]">
            {JSON.stringify(effectiveParams, null, 2)}
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
