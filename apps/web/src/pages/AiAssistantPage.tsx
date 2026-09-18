import React, { useState, useEffect, useRef } from "react";
import {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useApproveAiConfirmation,
  useRejectAiConfirmation,
} from "@/lib/queries";
import { aiService, ConversationItem, ConversationMessage } from "@/lib/api/services";
import { ApiAgentResponse, ApiAgentConfirmation } from "@/lib/api/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmationCard } from "@/components/ai/confirmation-card";
import { ChatMessage } from "@/components/ai/chat-message";
import { Bot, Send, Plus, Trash2, MessageSquare, AlertCircle, RefreshCw } from "lucide-react";

interface LocalMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  isThinking?: boolean;
  confirmation?: ApiAgentConfirmation & {
    status?: "pending" | "confirmed" | "cancelled" | "executing" | "expired";
  };
  confirmations?: Array<
    ApiAgentConfirmation & {
      status?: "pending" | "confirmed" | "cancelled" | "executing" | "expired";
    }
  >;
}

export const AiAssistantPage: React.FC = () => {
  const { data: conversationsRes, isLoading: isConvsLoading, refetch: refetchConvs } = useConversations();
  const conversations: ConversationItem[] = conversationsRes?.items || conversationsRes?.data || [];

  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);

  const {
    data: messagesRes,
    isLoading: isMsgsLoading,
    refetch: refetchMsgs,
  } = useConversationMessages(activeConversationId);

  const sendMessageMutation = useSendMessage();
  const approveConfirmationMutation = useApproveAiConfirmation();
  const rejectConfirmationMutation = useRejectAiConfirmation();

  const [localMessages, setLocalMessages] = useState<LocalMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [error, setError] = useState("");
  const [submittingConfirmationId, setSubmittingConfirmationId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Sync query messages to local state when activeConversationId changes
  useEffect(() => {
    if (messagesRes) {
      const list = messagesRes.items || messagesRes.data || [];
      const items: LocalMessage[] = list.map((m: ConversationMessage) => {
        let content = m.content || "";
        if (content.includes("Confirmation required to execute")) {
          content = content.replace(
            /Confirmation required to execute \w+\. Please confirm or cancel this financial action\./g,
            "Esta operação financeira requereu sua confirmação para ser concluída."
          );
        }
        const confirmations =
          m.confirmations && m.confirmations.length > 0
            ? m.confirmations
            : m.confirmation
            ? [m.confirmation]
            : undefined;

        return {
          id: m.id,
          role: String(m.role).toLowerCase() === "user" ? "user" : "assistant",
          content,
          timestamp: new Date(m.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          confirmation: m.confirmation,
          confirmations,
        };
      });
      setLocalMessages(items);
      setTimeout(scrollToBottom, 100);
    }
  }, [messagesRes]);

  const handleSelectConversation = (convId: string) => {
    setActiveConversationId(convId);
    setError("");
  };

  const handleNewConversation = async () => {
    try {
      const newConv = await aiService.createConversation("Nova Conversa");
      await refetchConvs();
      setActiveConversationId(newConv.id);
      setLocalMessages([
        {
          id: "welcome-" + Date.now(),
          role: "assistant",
          content: "Olá! Sou o assistente financeiro FinBuddy. Como posso ajudar você hoje?",
          timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao criar nova conversa.");
    }
  };

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.deleteConversation(convId);
      await refetchConvs();
      if (activeConversationId === convId) {
        setActiveConversationId(undefined);
        setLocalMessages([]);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Erro ao excluir conversa.");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || sendMessageMutation.isPending) return;

    if (inputMessage.trim().length > 500) {
      setError("A mensagem não pode exceder 500 caracteres.");
      return;
    }

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

    const pendingAssistantMsgId = "pending-assistant-" + Date.now();
    const pendingMsg: LocalMessage = {
      id: pendingAssistantMsgId,
      role: "assistant",
      content: "...",
      isThinking: true,
    };

    setLocalMessages((prev) => [...prev, newMsg, pendingMsg]);
    setTimeout(scrollToBottom, 50);

    try {
      const response: ApiAgentResponse = await sendMessageMutation.mutateAsync({
        message: userText,
        conversationId: activeConversationId,
      });

      if (response.conversationId && !activeConversationId) {
        setActiveConversationId(response.conversationId);
        await refetchConvs();
      }

      const confirmations =
        response.type === "confirmation_required" && response.confirmations?.length
          ? response.confirmations
          : response.type === "confirmation_required" && response.confirmation
          ? [response.confirmation]
          : undefined;

      const assistantMsg: LocalMessage = {
        id: "assistant-" + Date.now(),
        role: "assistant",
        content: response.message,
        timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        confirmation: response.type === "confirmation_required" ? response.confirmation : undefined,
        confirmations,
      };

      setLocalMessages((prev) =>
        prev.map((m) => (m.id === pendingAssistantMsgId ? assistantMsg : m))
      );
    } catch (err: unknown) {
      setLocalMessages((prev) => prev.filter((m) => m.id !== pendingAssistantMsgId));
      setError(
        err instanceof Error
          ? err.message
          : "Ocorreu um erro ao comunicar com o assistente IA. Por favor, tente novamente."
      );
    } finally {
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleConfirmAction = async (confirmationId: string) => {
    setSubmittingConfirmationId(confirmationId);
    setError("");
    try {
      await approveConfirmationMutation.mutateAsync({
        confirmationId,
        conversationId: activeConversationId,
      });

      setLocalMessages((prev) =>
        prev
          .map((m) => {
            let updatedConfirmation = m.confirmation;
            let updatedConfirmations = m.confirmations;

            if (
              m.confirmation &&
              (m.confirmation.confirmationId === confirmationId ||
                m.confirmation.id === confirmationId)
            ) {
              updatedConfirmation = {
                ...m.confirmation,
                status: "confirmed" as const,
              };
            }

            if (m.confirmations) {
              updatedConfirmations = m.confirmations.map((c) =>
                c.confirmationId === confirmationId || c.id === confirmationId
                  ? { ...c, status: "confirmed" as const }
                  : c
              );
            }

            if (updatedConfirmation || updatedConfirmations) {
              return {
                ...m,
                confirmation: updatedConfirmation,
                confirmations: updatedConfirmations,
              };
            }
            return m;
          })
          .concat({
            id: "sys-" + Date.now(),
            role: "assistant",
            content: "✅ Operação financeira confirmada e executada com sucesso!",
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao executar confirmação financeira.");
    } finally {
      setSubmittingConfirmationId(null);
      setTimeout(scrollToBottom, 100);
    }
  };

  const handleCancelAction = async (confirmationId: string) => {
    setSubmittingConfirmationId(confirmationId);
    setError("");
    try {
      await rejectConfirmationMutation.mutateAsync({
        confirmationId,
        conversationId: activeConversationId,
      });

      setLocalMessages((prev) =>
        prev.map((m) => {
          let updatedConfirmation = m.confirmation;
          let updatedConfirmations = m.confirmations;

          if (
            m.confirmation &&
            (m.confirmation.confirmationId === confirmationId ||
              m.confirmation.id === confirmationId)
          ) {
            updatedConfirmation = {
              ...m.confirmation,
              status: "cancelled" as const,
            };
          }

          if (m.confirmations) {
            updatedConfirmations = m.confirmations.map((c) =>
              c.confirmationId === confirmationId || c.id === confirmationId
                ? { ...c, status: "cancelled" as const }
                : c
            );
          }

          if (updatedConfirmation || updatedConfirmations) {
            return {
              ...m,
              confirmation: updatedConfirmation,
              confirmations: updatedConfirmations,
            };
          }
          return m;
        })
      );
              };
            }
            return m;
          })
          .concat({
            id: "sys-" + Date.now(),
            role: "assistant",
            content: "❌ Operação cancelada pelo usuário.",
            timestamp: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          })
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao cancelar operação.");
    } finally {
      setSubmittingConfirmationId(null);
      setTimeout(scrollToBottom, 100);
    }
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-[calc(100vh-4rem)] overflow-hidden min-w-0">
      {/* Sidebar: Conversation List */}
      <div className="w-full md:w-80 border-r bg-card flex flex-col shrink-0">
        <div className="h-16 px-4 border-b flex items-center justify-between shrink-0 bg-card">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary shrink-0" />
            <h2 className="font-bold text-base text-foreground">Conversas IA</h2>
          </div>
          <Button size="sm" onClick={handleNewConversation} disabled={isConvsLoading}>
            <Plus className="h-4 w-4 mr-1" />
            Nova
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {isConvsLoading ? (
            <div className="text-center py-8 text-xs text-muted-foreground">Carregando histórico...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground px-4">
              Nenhuma conversa iniciada. Clique em "Nova" para conversar com o FinBuddy IA.
            </div>
          ) : (
            conversations.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectConversation(c.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs cursor-pointer transition-colors ${
                  activeConversationId === c.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-accent/50 text-foreground"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-1">
                  <MessageSquare className="h-4 w-4 shrink-0 opacity-70" />
                  <span className="truncate">{c.title || "Conversa FinBuddy"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-red-500 shrink-0"
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  disabled={isConvsLoading}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full bg-background min-w-0">
        {/* Chat Header */}
        <div className="h-16 px-4 border-b bg-card flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0 pr-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
              <Bot className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-foreground leading-tight truncate">Assistente Financeiro FinBuddy</h3>
              <p className="text-xs text-muted-foreground truncate">
                Pergunte sobre saldos, extratos ou peça para agendar transações
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            disabled={isConvsLoading || isMsgsLoading}
            onClick={() => {
              refetchConvs();
              if (activeConversationId) refetchMsgs();
            }}
          >
            <RefreshCw className={`h-4 w-4 ${isMsgsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {localMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
              <Bot className="h-12 w-12 mb-3 text-primary opacity-40 stroke-1" />
              <h4 className="font-semibold text-foreground text-base">Como posso ajudar suas finanças hoje?</h4>
              <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                Exemplos: "Qual meu saldo no Bradesco?", "Quanto gastei com mercado este mês?", "Adicione uma despesa de R$ 50 em alimentação".
              </p>
            </div>
          ) : (
            localMessages.map((msg) => (
              <div key={msg.id} className="space-y-3">
                <ChatMessage
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.timestamp}
                  isThinking={msg.isThinking}
                />

                {/* Confirmation Cards Overlay */}
                {msg.confirmations && msg.confirmations.length > 0 ? (
                  <div className="pl-11 space-y-3 max-w-xl">
                    {msg.confirmations.map((conf, idx) => {
                      const cId = conf.confirmationId || conf.id || `conf-${idx}`;
                      return (
                        <ConfirmationCard
                          key={cId}
                          {...conf}
                          confirmationId={cId}
                          onConfirm={() => handleConfirmAction(cId)}
                          onCancel={() => handleCancelAction(cId)}
                          isSubmitting={submittingConfirmationId === cId}
                        />
                      );
                    })}
                  </div>
                ) : msg.confirmation ? (
                  <div className="pl-11 max-w-xl">
                    <ConfirmationCard
                      {...msg.confirmation}
                      confirmationId={msg.confirmation.confirmationId || msg.confirmation.id}
                      onConfirm={() => handleConfirmAction(msg.confirmation!.confirmationId || msg.confirmation!.id || "")}
                      onCancel={() => handleCancelAction(msg.confirmation!.confirmationId || msg.confirmation!.id || "")}
                      isSubmitting={submittingConfirmationId === (msg.confirmation.confirmationId || msg.confirmation.id)}
                    />
                  </div>
                ) : null}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="mx-4 mb-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t bg-card">
          <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
            <div className="flex-1 relative flex items-center">
              <Input
                placeholder="Digite sua pergunta ou instrução financeira..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={sendMessageMutation.isPending}
                maxLength={500}
                className="flex-1 pr-20"
              />
              <span
                className={`absolute right-3 text-xs select-none font-mono ${
                  inputMessage.length >= 500
                    ? "text-red-500 font-semibold"
                    : inputMessage.length >= 400
                    ? "text-amber-500"
                    : "text-muted-foreground/60"
                }`}
              >
                {inputMessage.length}/500
              </span>
            </div>
            <Button
              type="submit"
              disabled={sendMessageMutation.isPending || !inputMessage.trim() || inputMessage.length > 500}
            >
              {sendMessageMutation.isPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantPage;
