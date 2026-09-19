import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { transferService } from "@/lib/api/services";
import { CreateTransferDto, UpdateTransferDto } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/query-keys";

export function useTransfers(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.transfers.list(filters),
    queryFn: () => transferService.findAll(),
  });
}

export function useTransfer(id?: string) {
  return useQuery({
    queryKey: queryKeys.transfers.detail(id!),
    queryFn: () => transferService.findOne(id!),
    enabled: !!id,
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransferDto) => transferService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

export function useUpdateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateTransferDto }) =>
      transferService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}

export function useDeleteTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transferService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.transfers.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
    },
  });
}
