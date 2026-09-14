import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bot, User } from "lucide-react";

export interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isThinking?: boolean;
  className?: string;
}

function parseInlineMarkdown(text: string, isUser: boolean): React.ReactNode[] {
  // Regex matches **bold**, __bold__, `code`, *italic*, _italic_
  const regex = /(\*\*.*?\*\*|__.*?__|`.*?`|\*.*?\*|_.*?_)/g;
  const parts = text.split(regex);

  return parts.map((part, index) => {
    if ((part.startsWith("**") && part.endsWith("**") && part.length >= 4) ||
        (part.startsWith("__") && part.endsWith("__") && part.length >= 4)) {
      return (
        <strong key={index} className="font-bold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length >= 2) {
      return (
        <code
          key={index}
          className={cn(
            "px-1.5 py-0.5 rounded font-mono text-xs",
            isUser ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
          )}
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if ((part.startsWith("*") && part.endsWith("*") && part.length >= 2) ||
        (part.startsWith("_") && part.endsWith("_") && part.length >= 2)) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

function FormattedText({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-1 whitespace-pre-wrap break-words">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();
        const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
        const cleanLine = isBullet ? trimmed.substring(2) : line;

        if (isBullet) {
          return (
            <div key={lineIndex} className="flex items-start gap-2 ml-1">
              <span className={cn("font-bold text-xs shrink-0 mt-0.5", isUser ? "text-primary-foreground" : "text-primary")}>•</span>
              <span className="flex-1">{parseInlineMarkdown(cleanLine, isUser)}</span>
            </div>
          );
        }

        return <div key={lineIndex}>{parseInlineMarkdown(line, isUser)}</div>;
      })}
    </div>
  );
}

export function ChatMessage({
  role,
  content,
  timestamp,
  isThinking = false,
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
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-primary" />}
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
        {isThinking ? (
          <div className="flex items-center gap-2 text-muted-foreground py-0.5">
            <span className="font-medium text-xs">Pensando</span>
            <div className="flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
            </div>
          </div>
        ) : (
          <FormattedText content={content} isUser={isUser} />
        )}
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
