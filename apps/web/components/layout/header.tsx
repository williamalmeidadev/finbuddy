"use client";

import * as React from "react";
import { Menu, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  onOpenMobileNav: () => void;
  title?: string;
}

export function Header({ onOpenMobileNav, title = "Dashboard" }: HeaderProps) {
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

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notifications"
          className="relative text-muted-foreground hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-emerald-500" />
        </Button>

        <div className="flex items-center gap-2 pl-2">
          <Avatar className="h-8 w-8 cursor-pointer border">
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
              FB
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
