import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transactionService } from "@/lib/api/services";
import { CreateTransactionDto, UpdateTransactionDto, ApiTransaction } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/query-keys";
import { toast } from "@/components/ui/sonner";

export function useTransactions(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.transactions.list(filters),
    queryFn: () => transactionService.findAll(filters),
  });
}

export function useTransaction(id?: string) {
  return useQuery({
    queryKey: queryKeys.transactions.detail(id!),
    queryFn: () => transactionService.findOne(id!),
    enabled: !!id,
  });
}

const handleBudgetAlertToast = (transactionData?: ApiTransaction) => {
  if (transactionData?.budgetAlert) {
    const { alertLevel, message } = transactionData.budgetAlert;
    if (alertLevel === "EXCEEDED") {
      toast.error(message);
    } else if (alertLevel === "CRITICAL" || alertLevel === "WARNING") {
      toast.warning(message);
    } else {
      toast.info(message);
    }
  }
};

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionDto) => transactionService.create(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      handleBudgetAlertToast(data);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTransactionDto }) =>
      transactionService.update(id, dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      handleBudgetAlertToast(data);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}
