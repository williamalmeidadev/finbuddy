import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/financial/money-display";
import { Badge } from "@/components/ui/badge";

export default function TransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transactions Ledger</h2>
        <p className="text-sm text-muted-foreground">
          View and audit all income, expense, and system transactions.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold">Supermarket Shopping</p>
                <p className="text-xs text-muted-foreground">Main Checking • Food & Groceries</p>
              </div>
              <div className="text-right">
                <MoneyDisplay amount={-345.5} colored />
                <p className="text-[11px] text-muted-foreground">2026-09-12</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold">Monthly Salary</p>
                <p className="text-xs text-muted-foreground">Main Checking • Income</p>
              </div>
              <div className="text-right">
                <MoneyDisplay amount={12500.0} colored />
                <p className="text-[11px] text-muted-foreground">2026-09-01</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
