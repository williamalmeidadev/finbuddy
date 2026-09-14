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

function isDelimiterRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("-")) return false;
  return /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(trimmed);
}

function splitTableRow(line: string): string[] {
  let trimmed = line.trim();
  if (trimmed.startsWith("|")) {
    trimmed = trimmed.substring(1);
  }
  if (trimmed.endsWith("|") && !trimmed.endsWith("\\|")) {
    trimmed = trimmed.substring(0, trimmed.length - 1);
  }
  const rawCells = trimmed.split(/(?<!\\)\|/);
  return rawCells.map((cell) => cell.replace(/\\\|/g, "|").trim());
}

function parseTableAlignments(delimiterLine: string): Array<"left" | "center" | "right"> {
  const rawCells = splitTableRow(delimiterLine);
  return rawCells.map((cell) => {
    const c = cell.trim();
    const startsWithColon = c.startsWith(":");
    const endsWithColon = c.endsWith(":");
    if (startsWithColon && endsWithColon) return "center";
    if (endsWithColon) return "right";
    if (startsWithColon) return "left";
    return "left";
  });
}

function FormattedText({ content, isUser }: { content: string; isUser: boolean }) {
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Check if line i starts a Markdown Table
    const isHeaderCandidate = line.includes("|");
    const nextIsDelimiter = i + 1 < lines.length && isDelimiterRow(lines[i + 1]);

    if (isHeaderCandidate && nextIsDelimiter) {
      const headerLine = lines[i];
      const delimiterLine = lines[i + 1];
      const headers = splitTableRow(headerLine);
      const alignments = parseTableAlignments(delimiterLine);

      const rows: string[][] = [];
      i += 2; // skip header and delimiter

      while (i < lines.length) {
        const rowLine = lines[i];
        const rowTrimmed = rowLine.trim();
        if (rowTrimmed === "" || !rowLine.includes("|")) {
          break;
        }
        rows.push(splitTableRow(rowLine));
        i++;
      }

      blocks.push(
        <div
          key={`table-${i}`}
          className={cn(
            "my-2.5 w-full overflow-x-auto rounded-md border shadow-2xs",
            isUser
              ? "border-primary-foreground/20 bg-primary-foreground/10"
              : "border-border bg-card/60"
          )}
        >
          <table className="w-full min-w-max text-xs border-collapse">
            <thead>
              <tr
                className={cn(
                  "border-b font-semibold",
                  isUser
                    ? "bg-primary-foreground/15 text-primary-foreground border-primary-foreground/20"
                    : "bg-muted/80 text-foreground border-border/60"
                )}
              >
                {headers.map((headerText, colIdx) => {
                  const align = alignments[colIdx] || "left";
                  return (
                    <th
                      key={colIdx}
                      className={cn(
                        "px-3 py-2 font-semibold border-r last:border-r-0",
                        align === "center" && "text-center",
                        align === "right" && "text-right",
                        align === "left" && "text-left",
                        isUser ? "border-primary-foreground/20" : "border-border/60"
                      )}
                    >
                      {parseInlineMarkdown(headerText, isUser)}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody
              className={cn(
                "divide-y text-xs",
                isUser
                  ? "divide-primary-foreground/15 text-primary-foreground"
                  : "divide-border/40 text-foreground"
              )}
            >
              {rows.map((rowCells, rowIdx) => (
                <tr
                  key={rowIdx}
                  className={cn(
                    "transition-colors",
                    isUser ? "hover:bg-primary-foreground/10" : "hover:bg-muted/40"
                  )}
                >
                  {headers.map((_, colIdx) => {
                    const cellText = rowCells[colIdx] ?? "";
                    const align = alignments[colIdx] || "left";
                    return (
                      <td
                        key={colIdx}
                        className={cn(
                          "px-3 py-2 border-r last:border-r-0 leading-relaxed",
                          align === "center" && "text-center",
                          align === "right" && "text-right",
                          align === "left" && "text-left",
                          isUser ? "border-primary-foreground/15" : "border-border/40"
                        )}
                      >
                        {parseInlineMarkdown(cellText, isUser)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    if (trimmed === "") {
      blocks.push(<div key={i} className="h-1" />);
      i++;
      continue;
    }

    // Horizontal Rule
    if (trimmed === "---" || trimmed === "***" || trimmed === "___") {
      blocks.push(
        <hr
          key={i}
          className={cn(
            "my-2 border-t",
            isUser ? "border-primary-foreground/30" : "border-border"
          )}
        />
      );
      i++;
      continue;
    }

    // Headings (#, ##, ###, ####, etc.)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const parsed = parseInlineMarkdown(text, isUser);

      if (level === 1) {
        blocks.push(
          <h1 key={i} className="text-base font-bold mt-3 mb-1">
            {parsed}
          </h1>
        );
      } else if (level === 2) {
        blocks.push(
          <h2 key={i} className="text-sm font-bold mt-2.5 mb-1">
            {parsed}
          </h2>
        );
      } else if (level === 3) {
        blocks.push(
          <h3 key={i} className="text-sm font-semibold mt-2 mb-0.5">
            {parsed}
          </h3>
        );
      } else {
        blocks.push(
          <h4 key={i} className="text-xs font-semibold mt-1.5 mb-0.5">
            {parsed}
          </h4>
        );
      }
      i++;
      continue;
    }

    // Blockquotes (> text)
    if (trimmed.startsWith("> ")) {
      const text = trimmed.slice(2);
      blocks.push(
        <blockquote
          key={i}
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
      i++;
      continue;
    }

    // Numbered List (1. , 2. , 10. )
    const numListMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numListMatch) {
      const num = numListMatch[1];
      const text = numListMatch[2];
      blocks.push(
        <div key={i} className="flex items-start gap-2 ml-1">
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
      i++;
      continue;
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

      blocks.push(
        <div key={i} className="flex items-start gap-2 ml-1">
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
      i++;
      continue;
    }

    // Normal paragraph line
    blocks.push(
      <div key={i} className="leading-relaxed">
        {parseInlineMarkdown(line, isUser)}
      </div>
    );
    i++;
  }

  return <div className="space-y-1.5 break-words">{blocks}</div>;
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
