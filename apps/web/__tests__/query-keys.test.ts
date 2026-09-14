import { queryKeys } from "../src/lib/query/query-keys";

describe("Query Keys Architecture", () => {
  it("should generate distinct query keys for different filter parameters", () => {
    const listA = queryKeys.transactions.list({ page: 1, limit: 10 });
    const listB = queryKeys.transactions.list({ page: 2, limit: 10 });
    expect(listA).not.toEqual(listB);
  });

  it("should generate distinct query keys for financial summary months", () => {
    const sumSep = queryKeys.financialSummary.month("2026-09");
    const sumAug = queryKeys.financialSummary.month("2026-08");
    expect(sumSep).not.toEqual(sumAug);
  });

  it("should structure AI conversation and message query keys properly", () => {
    const convs = queryKeys.ai.conversations(1, 20);
    const msgs = queryKeys.ai.messages("conv-123", 1, 50);
    expect(convs).toEqual(["ai", "conversations", { page: 1, limit: 20 }]);
    expect(msgs).toEqual(["ai", "messages", "conv-123", { page: 1, limit: 50 }]);
  });
});
