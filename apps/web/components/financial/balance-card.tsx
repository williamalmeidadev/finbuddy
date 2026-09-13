import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "./money-display";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  title: string;
  amount: number;
  currency?: string;
  icon?: LucideIcon;
  description?: string;
  className?: string;
}

export function BalanceCard({
  title,
  amount,
  currency = "BRL",
  icon: Icon,
  description,
  className,
}: BalanceCardProps) {
  return (
    <Card className={cn("overflow-hidden transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <MoneyDisplay amount={amount} currency={currency} showIcon colored />
        </div>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}
