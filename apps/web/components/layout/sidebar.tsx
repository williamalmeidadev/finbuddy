"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Landmark,
  Receipt,
  ArrowRightLeft,
  PieChart,
  Tag,
  Repeat,
  Bot,
  Settings,
  ShieldAlert,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Separator } from "@/components/ui/separator";

export const navigationItems = [
  { name: "Dashboard", href: "/app/dashboard", icon: LayoutDashboard },
  { name: "Accounts", href: "/app/accounts", icon: Landmark },
  { name: "Transactions", href: "/app/transactions", icon: Receipt },
  { name: "Transfers", href: "/app/transfers", icon: ArrowRightLeft },
  { name: "Budgets", href: "/app/budgets", icon: PieChart },
  { name: "Categories", href: "/app/categories", icon: Tag },
  { name: "Recurring", href: "/app/recurring", icon: Repeat },
  { name: "AI Assistant", href: "/app/ai", icon: Bot, badge: "AI" },
  { name: "Settings", href: "/app/settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full w-64 flex-col border-r bg-card px-4 py-6 shadow-sm",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg">
          F
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-base tracking-tight">FinBuddy</span>
          <span className="text-[10px] text-muted-foreground">Financial AI Assistant</span>
        </div>
      </div>

      <Separator className="my-4" />

      {/* Navigation Menu */}
      <nav className="flex-1 space-y-1">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <Separator className="my-4" />

      {/* Sidebar Footer */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="h-3.5 w-3.5 text-emerald-500" />
          <span>Production Hardened</span>
        </div>
        <ThemeToggle />
      </div>
    </aside>
  );
}
