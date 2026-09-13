"use client";

import * as React from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Check, X } from "lucide-react";
import { StatusBadge } from "@/components/financial/status-badge";

export interface ConfirmationCardProps {
  confirmationId: string;
  tool: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  parameters: Record<string, unknown>;
  expiresAt: string;
  onConfirm?: (confirmationId: string) => void;
  onCancel?: (confirmationId: string) => void;
  isSubmitting?: boolean;
}

export function ConfirmationCard({
  confirmationId,
  tool,
  riskLevel,
  parameters,
  expiresAt,
  onConfirm,
  onCancel,
  isSubmitting = false,
}: ConfirmationCardProps) {
  return (
    <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <CardTitle className="text-sm font-semibold">
              Confirmation Required
            </CardTitle>
          </div>
          <StatusBadge status="PENDING" />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex justify-between text-muted-foreground">
          <span>Tool: <strong className="text-foreground">{tool}</strong></span>
          <span>Risk: <strong className="text-amber-600 dark:text-amber-400">{riskLevel}</strong></span>
        </div>
        <div className="rounded-md bg-background/80 p-2.5 font-mono border">
          <pre className="whitespace-pre-wrap break-all text-[11px]">
            {JSON.stringify(parameters, null, 2)}
          </pre>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Expires at: {new Date(expiresAt).toLocaleTimeString()}
        </p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2">
        {onCancel && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCancel(confirmationId)}
            disabled={isSubmitting}
          >
            <X className="mr-1 h-3.5 w-3.5" /> Cancel
          </Button>
        )}
        {onConfirm && (
          <Button
            variant="financialPositive"
            size="sm"
            onClick={() => onConfirm(confirmationId)}
            disabled={isSubmitting}
          >
            <Check className="mr-1 h-3.5 w-3.5" /> Confirm Mutation
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
