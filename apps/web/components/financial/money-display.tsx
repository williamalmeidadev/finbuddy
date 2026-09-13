import * as React from "react";
import { cn } from "@/lib/utils";
import { formatCurrency, getFinancialVariant } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MoneyDisplayProps extends React.HTMLAttributes<HTMLSpanElement> {
  amount: number;
  currency?: string;
  locale?: string;
  showIcon?: boolean;
  colored?: boolean;
}

export function MoneyDisplay({
  amount,
  currency = "BRL",
  locale = "pt-BR",
  showIcon = false,
  colored = true,
  className,
  ...props
}: MoneyDisplayProps) {
  const variant = getFinancialVariant(amount);
  const formatted = formatCurrency(amount, currency, locale);

  const colorStyles = {
    positive: "text-emerald-600 dark:text-emerald-400 font-semibold",
    negative: "text-rose-600 dark:text-rose-400 font-semibold",
    neutral: "text-muted-foreground font-normal",
  };

  const Icon =
    variant === "positive"
      ? TrendingUp
      : variant === "negative"
      ? TrendingDown
      : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-sm tracking-tight",
        colored && colorStyles[variant],
        className
      )}
      aria-label={`${amount < 0 ? "Negative balance of" : "Positive balance of"} ${formatted}`}
      {...props}
    >
      {showIcon && <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />}
      <span>{formatted}</span>
    </span>
  );
}
