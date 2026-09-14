import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/lib/api/services";
import { queryKeys } from "@/lib/query/query-keys";

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.all,
    queryFn: () => authService.me(),
  });
}
