import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountCard } from "@/components/financial/account-card";

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Accounts</h2>
        <p className="text-sm text-muted-foreground">
          Manage your checking, savings, investment, and credit accounts.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <AccountCard id="acc-1" name="Main Checking" type="CHECKING" balance={15450.2} />
        <AccountCard id="acc-2" name="Emergency Fund" type="SAVINGS" balance={25000.0} />
        <AccountCard id="acc-3" name="Credit Card" type="CREDIT_CARD" balance={-2130.3} />
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Route Foundation Established</CardTitle>
          <CardDescription className="text-xs">
            Account CRUD functionality will be wired to NestJS API endpoints in future frontend roadmap phases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
