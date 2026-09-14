import React, { useState, useEffect, useRef, useCallback } from "react";
import { aiService, ConversationItem, ConversationMessage } from "@/lib/api/services";
import { ApiAgentResponse, ApiAgentConfirmation } from "@/lib/api/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationCard } from "@/components/ai/confirmation-card";
import { ChatMessage } from "@/components/ai/chat-message";
import { ToolActivity } from "@/components/ai/tool-activity";
import { Bot, Send, Plus, Trash2, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  confirmation?: ApiAgentConfirmation;
}

export const AiAssistantPage: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [isToolActive, setIsToolActive] = useState(false);
  const [activeToolMessage, setActiveToolMessage] = useState("");
  const [error, setError] = useState("");
  const [submittingConfirmationId, setSubmittingConfirmationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = useCallback(async () => {
    setIsConversationsLoading(true);
    try {
      const res = await aiService.listConversations();
      const list = res.items || res.data || [];
      setConversations(list);
    } catch {
      // Non-blocking
    } finally {
      setIsConversationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const loadMessages = useCallback(async (convId: string) => {
    setIsLoading(true);
    setError("");
    try {
      const res = await aiService.getConversationMessages(convId);
      const list = res.items || res.data || [];
      const items: LocalMessage[] = list.map((m: ConversationMessage) => ({
        id: m.id,
        role: String(m.role).toLowerCase() === "user" ? "user" : "assistant",
        content: m.content,
        timestamp: new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      }));
      setMessages(items);
    } catch (err: any) {
      setError(err?.message || "Erro ao carregar histórico da conversa.");
    } finally {
      setIsLoading(false);
      setTimeout(scrollToBottom, 100);
    }
  }, []);

  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    loadMessages(convId);
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await aiService.createConversation("Nova Conversa");
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      setMessages([
        {
          id: "welcome-" + Date.now(),
          role: "assistant",
          content: "Olá! Sou o assistente financeiro FinBuddy. Como posso ajudar você hoje?",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      setError(err?.message || "Erro ao criar nova conversa.");
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversationId === convId) {
        setActiveConversationId(undefined);
        setMessages([]);
      }
    } catch (err: any) {
      alert(err?.message || "Erro ao excluir conversa.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage("");
    setError("");

    const userMsgId = "user-" + Date.now();
    const newMsg: LocalMessage = {
      id: userMsgId,
      role: "user",
      content: userText,
      timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);
    setIsToolActive(true);
    setActiveToolMessage("Analisando suas finanças com o FinBuddy AI...");
    setTimeout(scrollToBottom, 50);

    try {
      const response: ApiAgentResponse = await aiService.sendMessage(userText, activeConversationId);

      if (response.conversationId && !activeConversationId) {
        setActiveConversationId(response.conversationId);
        await loadConversations();
      }

      const assistantMsg: LocalMessage = {
        id: "assistant-" + Date.now(),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        confirmation: response.type === "confirmation_required" ? response.confirmation : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setError(
        err?.message ||
          "Ocorreu um erro ao comunicar com o assistente IA. Por favor, tente novamente."
      );
    } finally {
      setIsLoading(false);
      setIsToolActive(false);
      setActiveToolMessage("");
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleConfirmAction = async (confirmationId: string) => {
    setSubmittingConfirmationId(confirmationId);
    setError("");
    try {
      const res = await aiService.confirmAction(confirmationId);
      setMessages((prev) => [
        ...prev,
        {
          id: "sys-" + Date.now(),
          role: "assistant",
          content: `✅ Operação financeira confirmada e executada com sucesso! ${res.message || ""}`,
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      setError(err?.message || "Erro ao executar confirmação financeira.");
    } finally {
      setSubmittingConfirmationId(null);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleCancelAction = async (confirmationId: string) => {
    setSubmittingConfirmationId(confirmationId);
    setError("");
    try {
      await aiService.cancelAction(confirmationId);
      setMessages((prev) => [
        ...prev,
        {
          id: "sys-" + Date.now(),
          role: "assistant",
          content: "❌ Operação financeira cancelada pelo usuário.",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: any) {
      setError(err?.message || "Erro ao cancelar operação.");
    } finally {
      setSubmittingConfirmationId(null);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] md:h-screen overflow-hidden bg-background">
      {/* Sidebar: Conversation List */}
      <div className="w-full md:w-80 border-r bg-card flex flex-col shrink-0 max-h-48 md:max-h-full overflow-y-auto">
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Bot className="h-5 w-5 text-primary" />
            <span>Conversas IA</span>
          </div>
          <Button variant="outline" size="sm" onClick={handleNewConversation}>
            <Plus className="h-4 w-4 mr-1" /> Nova
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isConversationsLoading ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Carregando conversas...</p>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground p-3 text-center">Nenhuma conversa salva.</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => handleSelectConversation(conv.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  activeConversationId === conv.id
                    ? "bg-primary text-primary-foreground font-semibold"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="truncate">{conv.title || "Conversa FinBuddy"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:text-destructive opacity-70 hover:opacity-100"
                  onClick={(e) => handleDeleteConversation(conv.id, e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Top Chat Bar */}
        <div className="p-4 border-b bg-card flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              FinBuddy Copilot IA
            </h1>
            <p className="text-xs text-muted-foreground">
              Seu assistente financeiro pessoal com autonomia para análise e ações seguras.
            </p>
          </div>
        </div>

        {/* Message History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 text-muted-foreground">
              <div className="p-4 rounded-full bg-primary/10 text-primary mb-3">
                <Bot className="h-10 w-10" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Como posso ajudar suas finanças hoje?</h3>
              <p className="text-xs max-w-md mt-1 mb-6">
                Pergunte sobre seus saldos, solicite relatórios de gastos ou peça para realizar transferências.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-left max-w-lg">
                <button
                  className="p-3 rounded-lg border bg-card hover:bg-muted text-foreground transition-colors"
                  onClick={() => setInputMessage("Qual é o meu saldo total consolidado?")}
                >
                  "Qual é o meu saldo total consolidado?"
                </button>
                <button
                  className="p-3 rounded-lg border bg-card hover:bg-muted text-foreground transition-colors"
                  onClick={() => setInputMessage("Quanto gastei este mês com despesas?")}
                >
                  "Quanto gastei este mês com despesas?"
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <React.Fragment key={msg.id}>
                <ChatMessage role={msg.role} content={msg.content} timestamp={msg.timestamp} />

                {/* Render Confirmation Card if confirmation_required */}
                {msg.confirmation && (
                  <div className="max-w-[85%] ml-11">
                    <ConfirmationCard
                      confirmationId={msg.confirmation.id}
                      tool={msg.confirmation.tool}
                      riskLevel={msg.confirmation.riskLevel}
                      parameters={msg.confirmation.parameters}
                      expiresAt={msg.confirmation.expiresAt}
                      onConfirm={handleConfirmAction}
                      onCancel={handleCancelAction}
                      isSubmitting={submittingConfirmationId === msg.confirmation.id}
                    />
                  </div>
                )}
              </React.Fragment>
            ))
          )}

          {isToolActive && (
            <div className="py-2">
              <ToolActivity message={activeToolMessage} />
            </div>
          )}

          {error && (
            <div className="p-3 text-xs text-destructive bg-destructive/10 rounded-md border border-destructive/20 font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-4 border-t bg-card flex gap-2 shrink-0">
          <Input
            placeholder="Digite sua pergunta ou solicitação financeira..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !inputMessage.trim()}>
            {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
};
