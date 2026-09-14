import { useQuery } from "@tanstack/react-query";
import { financialSummaryService } from "@/lib/api/services";
import { queryKeys } from "@/lib/query/query-keys";

export function useFinancialSummary(monthStr?: string) {
  return useQuery({
    queryKey: queryKeys.financialSummary.month(monthStr),
    queryFn: () => financialSummaryService.getSummary(monthStr),
  });
}
