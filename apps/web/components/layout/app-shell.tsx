"use client";

import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

const pageTitles: Record<string, string> = {
  "/app/dashboard": "Financial Dashboard",
  "/app/accounts": "Accounts Management",
  "/app/transactions": "Transactions Ledger",
  "/app/transfers": "Account Transfers",
  "/app/budgets": "Budget Planning",
  "/app/categories": "Financial Categories",
  "/app/recurring": "Recurring Automation",
  "/app/ai": "FinBuddy AI Assistant",
  "/app/settings": "Settings & Preferences",
};

export function AppShell({ children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  const title = pageTitles[pathname] || "FinBuddy";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Persistent Sidebar */}
      <Sidebar className="hidden md:flex shrink-0" />

      {/* Mobile Drawer Navigation */}
      <MobileNav open={mobileOpen} onOpenChange={setMobileOpen} />

      {/* Main App Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
