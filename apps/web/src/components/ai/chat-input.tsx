"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSubmit: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  maxLength?: number;
}

export function ChatInput({
  onSubmit,
  isLoading = false,
  placeholder = "Ask FinBuddy about your finances...",
  className,
  maxLength = 1000,
}: ChatInputProps) {
  const [value, setValue] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || isLoading || value.length > maxLength) return;
    onSubmit(value.trim());
    setValue("");
  };

  const isNearLimit = value.length >= maxLength * 0.8;
  const isAtLimit = value.length >= maxLength;

  return (
    <div className="w-full flex flex-col gap-1">
      <form
        onSubmit={handleSubmit}
        className={cn("flex w-full items-center gap-2 rounded-lg border bg-background p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring", className)}
      >
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          disabled={isLoading}
          maxLength={maxLength}
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Ask AI Assistant"
        />
        <span
          className={cn(
            "text-xs px-2 select-none font-mono",
            isAtLimit
              ? "text-red-500 font-semibold"
              : isNearLimit
              ? "text-amber-500"
              : "text-muted-foreground/60"
          )}
        >
          {value.length}/{maxLength}
        </span>
        <Button
          type="submit"
          size="icon"
          disabled={!value.trim() || isLoading || value.length > maxLength}
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  );
}
