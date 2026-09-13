import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function RecurringPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Recurring Automation</h2>
        <p className="text-sm text-muted-foreground">
          Manage subscriptions, salary schedules, and automated recurring transactions.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recurring Automation Foundation</CardTitle>
          <CardDescription className="text-xs">
            Automated schedule controls and executions view will be connected in future phases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
