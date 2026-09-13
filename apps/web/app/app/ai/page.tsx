"use client";

import * as React from "react";
import { ChatMessage } from "@/components/ai/chat-message";
import { ChatInput } from "@/components/ai/chat-input";
import { ToolActivity } from "@/components/ai/tool-activity";
import { ConfirmationCard } from "@/components/ai/confirmation-card";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, Sparkles } from "lucide-react";

export default function AiPage() {
  const [messages, setMessages] = React.useState<
    Array<{ role: "user" | "assistant"; content: string; timestamp?: string }>
  >([
    {
      role: "assistant",
      content:
        "Hello! I am FinBuddy, your personal AI financial assistant. You can ask me to inspect your balances, analyze monthly expenses, or propose financial transactions.",
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSendMessage = (text: string) => {
    const userMsg = {
      role: "user" as const,
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I've received your inquiry. Full AI conversational stream will be connected in future frontend phases.",
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    }, 800);
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-4">
      {/* AI Assistant Banner */}
      <div className="flex items-center justify-between rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">FinBuddy AI Financial Assistant</h2>
            <p className="text-xs text-muted-foreground">
              Production Hardened • Human Confirmation Enforced • Zero Direct DB Access
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Responses API Connected</span>
        </div>
      </div>

      {/* Chat Messages Container */}
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardContent className="flex flex-1 flex-col justify-between p-4 overflow-y-auto space-y-4">
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <ChatMessage
                key={idx}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))}

            {/* AI Tool Activity Sample */}
            <div className="py-2">
              <ToolActivity
                toolName="get_accounts"
                status="completed"
                details="Retrieved 3 financial accounts"
              />
            </div>

            {/* Confirmation Required Sample */}
            <ConfirmationCard
              confirmationId="sample-conf-1"
              tool="create_transaction"
              riskLevel="MEDIUM"
              parameters={{
                accountId: "a1111111-1111-4111-8111-111111111111",
                type: "EXPENSE",
                amount: 45.5,
                description: "Supermarket Purchase",
              }}
              expiresAt={new Date(Date.now() + 300000).toISOString()}
            />
          </div>
        </CardContent>
      </Card>

      {/* Chat Input */}
      <ChatInput onSubmit={handleSendMessage} isLoading={isLoading} />
    </div>
  );
}
