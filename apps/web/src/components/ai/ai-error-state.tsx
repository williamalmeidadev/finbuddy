import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertOctagon, RefreshCw } from "lucide-react";

interface AiErrorStateProps {
  message?: string;
  statusCode?: number;
  onRetry?: () => void;
  isLoading?: boolean;
}

export function AiErrorState({
  message = "An unexpected error occurred while communicating with FinBuddy AI.",
  statusCode,
  onRetry,
  isLoading = false,
}: AiErrorStateProps) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 text-destructive">
      <CardContent className="flex flex-col items-center justify-center p-6 text-center">
        <AlertOctagon className="h-10 w-10 mb-3" />
        <h4 className="text-base font-semibold">
          {statusCode === 503
            ? "AI Service Unavailable"
            : statusCode === 429
            ? "Rate Limit Exceeded"
            : "AI Communication Failure"}
        </h4>
        <p className="mt-1 text-xs text-muted-foreground max-w-md">
          {message}
        </p>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            disabled={isLoading}
            className="mt-4 border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Retry Request
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
