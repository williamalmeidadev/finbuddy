"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useAuth } from "@/lib/auth/auth-context";
import { User, Shield, Moon, Monitor } from "lucide-react";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings & Account</h1>
        <p className="text-sm text-muted-foreground">
          Manage profile details, display theme options, and application preferences.
        </p>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">User Profile</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Your authenticated account information.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={user?.name || ""} disabled className="bg-muted/50 font-medium" />
            </div>

            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input value={user?.email || ""} disabled className="bg-muted/50 font-mono text-xs" />
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span>Account Role</span>
            <Badge variant="outline" className="uppercase font-mono text-[10px]">
              {user?.role || "USER"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Appearance & Theme Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Appearance & Theme</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Toggle between light and dark visual themes.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Interface Color Mode</Label>
            <p className="text-xs text-muted-foreground">
              Select your preferred visual style or sync with system preferences.
            </p>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* System Security & Integrity */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Security & Authentication</CardTitle>
          </div>
          <CardDescription className="text-xs">
            FinBuddy API token security and session integrity details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-muted-foreground">
          <div className="flex justify-between border-b pb-2">
            <span>Token Auth Scheme</span>
            <span className="font-mono text-foreground font-semibold">JWT Bearer + Refresh Token</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span>API Server Baseline</span>
            <span className="font-mono text-foreground font-semibold">NestJS 11 + PostgreSQL 17</span>
          </div>
          <div className="flex justify-between">
            <span>AI Tool Confirmations</span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
              Enforced & Audit Logging Active
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
