import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiService } from "@/lib/api/services";
import { queryKeys } from "@/lib/query/query-keys";

export function useConversations(page = 1, limit = 20) {
  return useQuery({
    queryKey: queryKeys.ai.conversations(page, limit),
    queryFn: () => aiService.listConversations(page, limit),
  });
}

export function useConversationMessages(conversationId?: string, page = 1, limit = 50) {
  return useQuery({
    queryKey: queryKeys.ai.messages(conversationId!, page, limit),
    queryFn: () => aiService.getConversationMessages(conversationId!, page, limit),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ message, conversationId }: { message: string; conversationId?: string }) =>
      aiService.sendMessage(message, conversationId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all });
    },
  });
}

export function useApproveAiConfirmation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ confirmationId, conversationId }: { confirmationId: string; conversationId?: string }) =>
      aiService.confirmAction(confirmationId, conversationId),
    onSuccess: () => {
      // Invalidate AI queries and all financial queries affected by confirmed AI action
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

export function useRejectAiConfirmation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ confirmationId, conversationId }: { confirmationId: string; conversationId?: string }) =>
      aiService.cancelAction(confirmationId, conversationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.all });
    },
  });
}

export function useMemories() {
  return useQuery({
    queryKey: queryKeys.ai.memories(),
    queryFn: () => aiService.listMemories(),
  });
}

export function useDeleteMemory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memoryId: string) => aiService.deleteMemory(memoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.ai.memories() });
    },
  });
}
