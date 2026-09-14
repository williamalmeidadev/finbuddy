import { queryClient, clearQueryCacheOnLogout } from "../src/lib/query/query-client";

describe("Auth Logout Query Cache Invalidation", () => {
  it("should empty the query cache completely when clearQueryCacheOnLogout is called", () => {
    queryClient.setQueryData(["accounts"], [{ id: "acc-1", name: "Bank Account" }]);
    queryClient.setQueryData(["transactions"], [{ id: "tx-1", amount: 100 }]);
    queryClient.setQueryData(["financialSummary", "current"], { totalBalance: 1000 });

    expect(queryClient.getQueryData(["accounts"])).toBeDefined();
    expect(queryClient.getQueryData(["transactions"])).toBeDefined();
    expect(queryClient.getQueryData(["financialSummary", "current"])).toBeDefined();

    clearQueryCacheOnLogout();

    expect(queryClient.getQueryData(["accounts"])).toBeUndefined();
    expect(queryClient.getQueryData(["transactions"])).toBeUndefined();
    expect(queryClient.getQueryData(["financialSummary", "current"])).toBeUndefined();
  });
});
