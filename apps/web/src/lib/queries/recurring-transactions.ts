import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recurringService } from "@/lib/api/services";
import { CreateRecurringTransactionDto, UpdateRecurringTransactionDto } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/query-keys";

export function useRecurringTransactions(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.recurringTransactions.list(filters),
    queryFn: () => recurringService.findAll(),
  });
}

export function useRecurringTransaction(id?: string) {
  return useQuery({
    queryKey: queryKeys.recurringTransactions.detail(id!),
    queryFn: () => recurringService.findOne(id!),
    enabled: !!id,
  });
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateRecurringTransactionDto) => recurringService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringTransactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}

export function useUpdateRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateRecurringTransactionDto }) =>
      recurringService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringTransactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recurringService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.recurringTransactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}
