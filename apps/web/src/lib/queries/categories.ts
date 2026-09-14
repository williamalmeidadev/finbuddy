import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoryService } from "@/lib/api/services";
import { CreateCategoryDto, UpdateCategoryDto } from "@/lib/api/types";
import { queryKeys } from "@/lib/query/query-keys";

export function useCategories(filters?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.categories.list(filters),
    queryFn: () => categoryService.findAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes stale time for static category reference data
  });
}

export function useCategory(id?: string) {
  return useQuery({
    queryKey: queryKeys.categories.detail(id!),
    queryFn: () => categoryService.findOne(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCategoryDto) => categoryService.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateCategoryDto }) =>
      categoryService.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryService.deactivate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.budgets.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.financialSummary.all });
    },
  });
}
