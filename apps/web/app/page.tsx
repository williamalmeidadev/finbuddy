import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, ShieldCheck, Wallet } from "lucide-react";

export default function RootPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-semibold text-primary">
          <ShieldCheck className="h-4 w-4" />
          <span>Production Hardened AI Architecture</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
          Smart Financial Management with <span className="text-primary">FinBuddy</span>
        </h1>

        <p className="text-base text-muted-foreground sm:text-lg">
          Control your accounts, transactions, budgets, and recurring transfers with our deterministic, human-in-the-loop AI Assistant.
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <Link href="/app/dashboard">
            <Button size="lg" className="w-full sm:w-auto">
              Launch Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 pt-10 text-left sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <Wallet className="h-6 w-6 text-primary mb-2" />
            <h3 className="font-semibold text-sm">Financial Integrity</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Zero direct LLM database writes. Human confirmation required.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <Bot className="h-6 w-6 text-emerald-500 mb-2" />
            <h3 className="font-semibold text-sm">AI Tool Loop</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Deterministic responses with circuit breaker & rate limits.
            </p>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-blue-500 mb-2" />
            <h3 className="font-semibold text-sm">Tenant Isolation</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Strict JWT boundary & IDOR protection across all financial endpoints.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
