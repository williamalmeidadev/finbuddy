"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/theme/theme-toggle";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings & Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Configure application theme, security controls, and personal preferences.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance & Theme</CardTitle>
          <CardDescription className="text-xs">
            Toggle between light and dark modes or follow your system settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label>Theme Preference</Label>
          <ThemeToggle />
        </CardContent>
      </Card>
    </div>
  );
}
