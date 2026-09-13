"use client";

import * as React from "react";
import { Menu, Bell, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  onOpenMobileNav: () => void;
  title?: string;
}

export function Header({ onOpenMobileNav, title = "Dashboard" }: HeaderProps) {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-background/95 px-4 backdrop-blur transition-all md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onOpenMobileNav}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold tracking-tight md:text-xl">
          {title}
        </h1>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />
        </Button>

        <div className="flex items-center gap-2 pl-2 border-l">
          <Avatar className="h-8 w-8 cursor-pointer border">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              {user?.email ? user.email.substring(0, 2).toUpperCase() : "FB"}
            </AvatarFallback>
          </Avatar>
          {user?.email && (
            <span className="hidden lg:inline text-xs font-medium text-muted-foreground">
              {user.email}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            aria-label="Sign out"
            title="Sign out"
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
