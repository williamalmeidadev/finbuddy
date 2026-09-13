"use client";

import * as React from "react";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthProvider } from "@/lib/auth/auth-context";
import { AuthGuard } from "@/lib/auth/auth-guard";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <AuthGuard>{children}</AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}
