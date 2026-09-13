import * as React from "react";
import { Wrench, CheckCircle, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ToolActivityProps {
  toolName: string;
  status: "running" | "completed" | "failed";
  details?: string;
  className?: string;
}

export function ToolActivity({
  toolName,
  status,
  details,
  className,
}: ToolActivityProps) {
  const statusIcons = {
    running: Wrench,
    completed: CheckCircle,
    failed: AlertTriangle,
  };

  const statusColors = {
    running: "text-amber-500 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900",
    completed: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-900",
    failed: "text-rose-500 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900",
  };

  const Icon = statusIcons[status];

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-md border px-3 py-2 text-xs font-mono transition-colors",
        statusColors[status],
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5 shrink-0", status === "running" && "animate-spin")} />
      <span className="font-semibold">{toolName}</span>
      {details && <span className="text-muted-foreground">• {details}</span>}
    </div>
  );
}
