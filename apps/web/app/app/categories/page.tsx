import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CategoriesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
        <p className="text-sm text-muted-foreground">
          Organize income and expense classification categories.
        </p>
      </div>

      <Card className="border-dashed bg-muted/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Category Management Foundation</CardTitle>
          <CardDescription className="text-xs">
            System and user category customization UI will be wired in future roadmap phases.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
