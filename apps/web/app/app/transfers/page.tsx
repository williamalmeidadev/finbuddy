import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyDisplay } from "@/components/financial/money-display";

export default function TransfersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Transfers</h2>
        <p className="text-sm text-muted-foreground">
          Track atomic inter-account transfers and balance synchronizations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfer History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y text-sm">
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-semibold">Savings Allocation</p>
                <p className="text-xs text-muted-foreground">From Checking → Emergency Reserve</p>
              </div>
              <div className="text-right">
                <MoneyDisplay amount={2000.0} colored={false} />
                <p className="text-[11px] text-muted-foreground">2026-09-05</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
