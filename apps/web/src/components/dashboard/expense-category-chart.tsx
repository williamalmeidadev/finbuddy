import React, { useMemo } from "react";
import { PieChart, Pie, Cell } from "recharts";
import { ApiTransaction, ApiCategory } from "@/lib/api/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { PieChart as PieChartIcon } from "lucide-react";

interface ExpenseCategoryChartProps {
  transactions: ApiTransaction[];
  categories: ApiCategory[];
}

const CATEGORY_COLORS = [
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
];

export const ExpenseCategoryChart: React.FC<ExpenseCategoryChartProps> = ({
  transactions,
  categories,
}) => {
  const chartDataResult = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter expense transactions for current month
    const monthlyExpenses = transactions.filter((t) => {
      if (t.type !== "EXPENSE") return false;
      const txDate = new Date(t.transactionAt);
      return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
    });

    // Map category ID to name
    const categoryMap = new Map<string, string>();
    categories.forEach((cat) => categoryMap.set(cat.id, cat.name));

    // Group expenses by category
    const categoryTotals = new Map<string, number>();
    let grandTotal = 0;

    monthlyExpenses.forEach((t) => {
      const catName = t.category?.name || (t.categoryId ? categoryMap.get(t.categoryId) : null) || "Outros / Sem Categoria";
      const current = categoryTotals.get(catName) || 0;
      categoryTotals.set(catName, current + t.amount);
      grandTotal += t.amount;
    });

    const data: Array<{ name: string; value: number; color: string; percentage: number }> = [];
    const chartConfig: ChartConfig = {};

    let colorIndex = 0;
    categoryTotals.forEach((total, name) => {
      const color = CATEGORY_COLORS[colorIndex % CATEGORY_COLORS.length];
      const percentage = grandTotal > 0 ? (total / grandTotal) * 100 : 0;

      data.push({
        name,
        value: total,
        color,
        percentage,
      });

      chartConfig[name] = {
        label: name,
        color,
      };

      colorIndex++;
    });

    // Sort by largest expense first
    data.sort((a, b) => b.value - a.value);

    return {
      data,
      grandTotal,
      chartConfig,
    };
  }, [transactions, categories]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val);
  };

  const { data, grandTotal, chartConfig } = chartDataResult;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <div>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PieChartIcon className="h-5 w-5 text-primary" />
            Gastos do Mês por Categoria
          </CardTitle>
          <CardDescription>
            Distribuição percentual das despesas do mês atual.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-sm">
            <PieChartIcon className="h-10 w-10 mb-2 stroke-1 opacity-50" />
            <p className="font-medium">Nenhuma despesa registrada neste mês.</p>
            <p className="text-xs text-muted-foreground/80 mt-1">
              Lance transações do tipo Despesa para visualizar o gráfico.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center pt-2">
            {/* Pie / Donut Chart */}
            <div className="md:col-span-5 flex flex-col items-center justify-center relative min-h-[220px]">
              <ChartContainer config={chartConfig} className="h-[220px] w-full max-w-[220px]">
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    wrapperStyle={{ zIndex: 1000, outline: "none" }}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(val, name, item) => (
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <span className="font-medium">{item.payload.name}:</span>
                            <span className="font-bold">{formatCurrency(Number(val))} ({item.payload.percentage.toFixed(1)}%)</span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={58}
                    outerRadius={85}
                    paddingAngle={3}
                    strokeWidth={1}
                    stroke="var(--background)"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              {/* Total overlay in donut center */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Gastos
                </span>
                <span className="text-sm font-bold text-foreground">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
            </div>

            {/* Category Legend & Percentages List */}
            <div className="md:col-span-7 space-y-2.5 max-h-[240px] overflow-y-auto pr-1">
              {data.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/40 hover:bg-muted/70 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <span
                      className="h-3 w-3 rounded-full shrink-0 shadow-2xs"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-foreground truncate" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="font-bold text-muted-foreground min-w-[3rem] text-right bg-background px-1.5 py-0.5 rounded border text-[11px]">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
