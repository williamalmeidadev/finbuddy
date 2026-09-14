import * as React from "react";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

// Format: { [key: string]: { label?: React.ReactNode; icon?: React.ComponentType; color?: string } }
export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
    color?: string;
    theme?: Record<string, string>;
  }
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-chart={chartId}
        className={cn(
          "flex aspect-square justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[aria-disabled=true]]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted/50 [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[aria-disabled=true]]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer width="100%" height="100%">
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.theme || itemConfig.color
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color = itemConfig.color || itemConfig.theme?.light;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .filter(Boolean)
  .join("\n")}
}
`,
      }}
    />
  );
};

export const ChartTooltip = RechartsPrimitive.Tooltip;

export interface ChartTooltipContentProps extends React.ComponentProps<"div"> {
  active?: boolean;
  payload?: any[];
  hideLabel?: boolean;
  hideIndicator?: boolean;
  indicator?: "line" | "dot" | "dashed";
  nameKey?: string;
  labelKey?: string;
  formatter?: (value: any, name: any, item: any, index: number, payload: any) => React.ReactNode;
}

export function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  labelKey,
  formatter,
  nameKey,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md pointer-events-none",
        className
      )}
    >
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey || item.name || item.dataKey || "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);
          const indicatorColor = item.payload?.fill || item.color || itemConfig?.color;

          return (
            <div
              key={item.dataKey || index}
              className={cn(
                "flex w-full items-center justify-between gap-2 text-xs",
                indicator === "dot" && "items-center"
              )}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {!hideIndicator && (
                  <div
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ backgroundColor: indicatorColor }}
                  />
                )}
                <span className="text-muted-foreground truncate">
                  {itemConfig?.label || item.name}
                </span>
              </div>
              {item.value !== undefined && (
                <span className="font-mono font-medium text-foreground">
                  {formatter ? formatter(item.value, item.name, item, index, item.payload) : item.value}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
}
