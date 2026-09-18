import { queryClient, clearQueryCacheOnLogout } from "../src/lib/query/query-client";
import { ApiError } from "../src/lib/api/errors";

describe("QueryClient Configuration", () => {
  it("should have correct default options", () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(60000);
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
    expect(defaults.mutations?.retry).toBe(false);
  });

  it("should not retry on 401, 403, 400, or 404 ApiErrors", () => {
    const retryFn = queryClient.getDefaultOptions().queries?.retry as (
      failureCount: number,
      error: unknown,
    ) => boolean;
    expect(retryFn(1, new ApiError("Unauthorized", 401))).toBe(false);
    expect(retryFn(1, new ApiError("Bad Request", 400))).toBe(false);
    expect(retryFn(1, new ApiError("Forbidden", 403))).toBe(false);
    expect(retryFn(1, new ApiError("Not Found", 404))).toBe(false);
    expect(retryFn(1, new ApiError("Server Error", 500))).toBe(true);
    expect(retryFn(2, new ApiError("Server Error", 500))).toBe(false);
  });

  it("should clear query cache on logout", () => {
    queryClient.setQueryData(["test-key"], { data: "sample" });
    expect(queryClient.getQueryData(["test-key"])).toBeDefined();
    clearQueryCacheOnLogout();
    expect(queryClient.getQueryData(["test-key"])).toBeUndefined();
  });
});
