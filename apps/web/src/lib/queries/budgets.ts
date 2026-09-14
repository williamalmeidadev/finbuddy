import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { budgetService } from "@/lib/api/services";
import { CreateBudgetDto, UpdateBudgetDto } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/query-keys";

export function useBudgets(month?: string, categoryId?: string) {
  return useQuery({
    queryKey: queryKeys.budgets.list(month, categoryId),
    queryFn: () => budgetService.findAll(month, categoryId),
  });
}

export function useBudget(id?: string) {
  return useQuery({
    queryKey: queryKeys.budgets.detail(id!),
    queryFn: () => budgetService.findOne(id!),
    enabled: !!id,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateBudgetDto) => budgetService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateBudgetDto }) =>
      budgetService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}
