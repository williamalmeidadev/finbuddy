import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoneyDisplay } from "./money-display";
import { CreditCard, Landmark, Wallet, TrendingUp } from "lucide-react";

export interface AccountCardProps {
  id: string;
  name: string;
  type: "CHECKING" | "SAVINGS" | "CREDIT_CARD" | "INVESTMENT" | "CASH";
  balance: number;
  currency?: string;
}

const typeIcons = {
  CHECKING: Landmark,
  SAVINGS: Wallet,
  CREDIT_CARD: CreditCard,
  INVESTMENT: TrendingUp,
  CASH: Wallet,
};

const typeLabels = {
  CHECKING: "Checking Account",
  SAVINGS: "Savings Account",
  CREDIT_CARD: "Credit Card",
  INVESTMENT: "Investment Account",
  CASH: "Cash Wallet",
};

export function AccountCard({
  name,
  type,
  balance,
  currency = "BRL",
}: AccountCardProps) {
  const Icon = typeIcons[type] || Landmark;
  const label = typeLabels[type] || type;

  return (
    <Card className="transition-all hover:border-primary/50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-4 w-4 text-foreground" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">{name}</CardTitle>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        </div>
        <Badge variant="outline">{type}</Badge>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="text-xl font-bold">
          <MoneyDisplay amount={balance} currency={currency} colored />
        </div>
      </CardContent>
    </Card>
  );
}
