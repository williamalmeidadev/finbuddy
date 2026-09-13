import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  className?: string;
}

export function ChatMessage({
  role,
  content,
  timestamp,
  className,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 py-3",
        isUser ? "flex-row-reverse" : "flex-row",
        className
      )}
    >
      <Avatar className={cn("h-8 w-8 shrink-0", isUser ? "bg-primary text-primary-foreground" : "bg-muted")}>
        <AvatarFallback>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          "flex max-w-[80%] flex-col rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-card text-card-foreground border"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        {timestamp && (
          <span
            className={cn(
              "mt-1 text-[10px]",
              isUser ? "text-primary-foreground/70" : "text-muted-foreground"
            )}
          >
            {timestamp}
          </span>
        )}
      </div>
    </div>
  );
}
