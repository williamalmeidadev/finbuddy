import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Budgets</h2>
        <p className="text-sm text-muted-foreground">
          Plan and monitor monthly spending limits across categories.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Budget Planning Foundation</CardTitle>
          <CardDescription className="text-xs">
            Category budget allocations will be linked in upcoming frontend feature releases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
