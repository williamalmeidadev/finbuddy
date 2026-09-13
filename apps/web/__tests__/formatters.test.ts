import {
  formatCurrency,
  formatPercentage,
  formatDate,
  getFinancialVariant,
} from "../lib/formatters";

describe("Financial Formatters", () => {
  it("should format positive currency correctly", () => {
    const formatted = formatCurrency(1250.5, "BRL", "pt-BR");
    expect(formatted).toContain("1.250,50");
  });

  it("should format negative currency correctly", () => {
    const formatted = formatCurrency(-500.25, "BRL", "pt-BR");
    expect(formatted).toContain("500,25");
  });

  it("should format percentages correctly", () => {
    expect(formatPercentage(15.5, "pt-BR")).toContain("15,5");
  });

  it("should format dates correctly", () => {
    const dateStr = "2026-09-13T12:00:00.000Z";
    const formatted = formatDate(dateStr, "pt-BR");
    expect(formatted).toContain("13/09/2026");
  });

  it("should determine financial variant accurately", () => {
    expect(getFinancialVariant(100)).toBe("positive");
    expect(getFinancialVariant(-50)).toBe("negative");
    expect(getFinancialVariant(0)).toBe("neutral");
  });
});
