"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  title?: string;
}

export function Sheet({
  open,
  onOpenChange,
  children,
  side = "left",
  title = "Navigation Menu",
}: SheetProps) {
  if (!open) return null;

  const sideStyles = {
    left: "inset-y-0 left-0 h-full w-3/4 max-w-sm border-r",
    right: "inset-y-0 right-0 h-full w-3/4 max-w-sm border-l",
    top: "inset-x-0 top-0 w-full border-b",
    bottom: "inset-x-0 bottom-0 w-full border-t",
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />
      {/* Sheet Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out animate-in duration-300",
          sideStyles[side]
        )}
      >
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  );
}
