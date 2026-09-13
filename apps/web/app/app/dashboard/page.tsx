import * as React from "react";
import { BalanceCard } from "@/components/financial/balance-card";
import { AccountCard } from "@/components/financial/account-card";
import { DollarSign, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Overview Balance Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <BalanceCard
          title="Total Net Worth"
          amount={42580.5}
          icon={DollarSign}
          description="Across all connected accounts"
        />
        <BalanceCard
          title="Monthly Income"
          amount={12500.0}
          icon={ArrowUpRight}
          description="Current calendar month"
        />
        <BalanceCard
          title="Monthly Expenses"
          amount={-4820.3}
          icon={ArrowDownRight}
          description="Current calendar month"
        />
        <BalanceCard
          title="Net Cash Flow"
          amount={7679.7}
          icon={Wallet}
          description="Income minus expenses"
        />
      </div>

      {/* Account Overview Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Connected Accounts</h2>
          <Badge variant="outline">3 Active</Badge>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <AccountCard
            id="acc-1"
            name="Main Checking Account"
            type="CHECKING"
            balance={15450.2}
          />
          <AccountCard
            id="acc-2"
            name="Emergency Reserve"
            type="SAVINGS"
            balance={25000.0}
          />
          <AccountCard
            id="acc-3"
            name="Rewards Credit Card"
            type="CREDIT_CARD"
            balance={-2130.3}
          />
        </div>
      </div>

      {/* Foundation Placeholder Notice */}
      <Card className="border-dashed bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Phase 20 Frontend Foundation</CardTitle>
          <CardDescription>
            The production-quality Next.js + Tailwind + shadcn/ui layout foundation is established. Full API data fetching will be implemented in subsequent phases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
