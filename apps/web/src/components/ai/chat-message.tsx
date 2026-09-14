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
    <div className="space-y-1.5 break-words">
      {lines.map((line, lineIndex) => {
        const trimmed = line.trim();

        if (trimmed === "") {
          return <div key={lineIndex} className="h-1" />;
        }

        // Horizontal Rule
        if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
          return (
            <hr
              key={lineIndex}
              className={cn(
                "my-2 border-t",
                isUser ? "border-primary-foreground/30" : "border-border"
              )}
            />
          );
        }

        // Headings (#, ##, ###, ####, etc.)
        const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const text = headingMatch[2];
          const parsed = parseInlineMarkdown(text, isUser);

          if (level === 1) {
            return (
              <h1 key={lineIndex} className="text-base font-bold mt-3 mb-1">
                {parsed}
              </h1>
            );
          }
          if (level === 2) {
            return (
              <h2 key={lineIndex} className="text-sm font-bold mt-2.5 mb-1">
                {parsed}
              </h2>
            );
          }
          if (level === 3) {
            return (
              <h3 key={lineIndex} className="text-sm font-semibold mt-2 mb-0.5">
                {parsed}
              </h3>
            );
          }
          return (
            <h4 key={lineIndex} className="text-xs font-semibold mt-1.5 mb-0.5">
              {parsed}
            </h4>
          );
        }

        // Blockquotes (> text)
        if (trimmed.startsWith("> ")) {
          const text = trimmed.slice(2);
          return (
            <blockquote
              key={lineIndex}
              className={cn(
                "border-l-2 pl-2.5 py-0.5 italic my-1 text-xs",
                isUser
                  ? "border-primary-foreground/50 text-primary-foreground/90"
                  : "border-primary/50 text-muted-foreground"
              )}
            >
              {parseInlineMarkdown(text, isUser)}
            </blockquote>
          );
        }

        // Numbered List (1. , 2. , 10. )
        const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numListMatch) {
          const num = numListMatch[1];
          const text = numListMatch[2];
          return (
            <div key={lineIndex} className="flex items-start gap-2 ml-1">
              <span
                className={cn(
                  "font-semibold text-xs shrink-0 min-w-[1.25rem]",
                  isUser ? "text-primary-foreground/90" : "text-primary"
                )}
              >
                {num}.
              </span>
              <span className="flex-1 leading-relaxed">
                {parseInlineMarkdown(text, isUser)}
              </span>
            </div>
          );
        }

        // Bullet List (- , * , • or solitary •)
        const isBullet =
          trimmed.startsWith("- ") ||
          trimmed.startsWith("* ") ||
          trimmed.startsWith("• ") ||
          trimmed.startsWith("•");

        if (isBullet) {
          let cleanLine = trimmed;
          if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
            cleanLine = trimmed.substring(2);
          } else if (trimmed.startsWith("• ")) {
            cleanLine = trimmed.substring(2);
          } else if (trimmed.startsWith("•")) {
            cleanLine = trimmed.substring(1).trim();
          }

          return (
            <div key={lineIndex} className="flex items-start gap-2 ml-1">
              <span
                className={cn(
                  "font-bold text-xs shrink-0 mt-0.5",
                  isUser ? "text-primary-foreground" : "text-primary"
                )}
              >
                •
              </span>
              <span className="flex-1 leading-relaxed">
                {parseInlineMarkdown(cleanLine, isUser)}
              </span>
            </div>
          );
        }

        // Normal paragraph line
        return (
          <div key={lineIndex} className="leading-relaxed">
            {parseInlineMarkdown(line, isUser)}
          </div>
        );
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
