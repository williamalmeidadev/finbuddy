import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";

export type SystemStatus =
  | "PENDING"
  | "CONSUMED"
  | "CANCELLED"
  | "EXPIRED"
  | "COMPLETED"
  | "FAILED";

interface StatusBadgeProps {
  status: SystemStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const configs = {
    PENDING: {
      variant: "warning" as const,
      icon: Clock,
      label: "Pending",
    },
    CONSUMED: {
      variant: "positive" as const,
      icon: CheckCircle2,
      label: "Confirmed",
    },
    COMPLETED: {
      variant: "positive" as const,
      icon: CheckCircle2,
      label: "Completed",
    },
    CANCELLED: {
      variant: "negative" as const,
      icon: XCircle,
      label: "Cancelled",
    },
    EXPIRED: {
      variant: "secondary" as const,
      icon: AlertCircle,
      label: "Expired",
    },
    FAILED: {
      variant: "destructive" as const,
      icon: AlertCircle,
      label: "Failed",
    },
  };

  const config = configs[status] || {
    variant: "secondary" as const,
    icon: Clock,
    label: status,
  };

  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={className}>
      <Icon className="mr-1 h-3 w-3" aria-hidden="true" />
      <span>{config.label}</span>
    </Badge>
  );
}
