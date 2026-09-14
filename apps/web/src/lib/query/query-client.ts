import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api/errors";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute default stale time
      gcTime: 5 * 60 * 1000, // 5 minutes in-memory garbage collection time
      refetchOnWindowFocus: false, // Avoid excessive refetches when switching tabs
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        // Do not retry 401, 403, 400, 404 or validation errors
        if (error instanceof ApiError) {
          if ([400, 401, 403, 404, 422].includes(error.statusCode)) {
            return false;
          }
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false, // Financial mutations must not auto-retry to prevent duplicates
    },
  },
});

export const clearQueryCacheOnLogout = () => {
  queryClient.clear();
};
