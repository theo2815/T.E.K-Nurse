"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DailyPoint } from "@/lib/supabase/queries/reports";
import { formatLong, formatShort } from "@/lib/reports/date-range";
import {
  AXIS_LINE,
  AXIS_TICK,
  CHART_COLORS,
  GRID,
  TOOLTIP_CONTENT_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  TOOLTIP_WRAPPER_STYLE,
} from "./chart-theme";

export function UsageTrendChart({
  data,
  unitLabel,
}: {
  data: DailyPoint[];
  unitLabel?: string;
}) {
  const step = data.length > 60 ? 14 : data.length > 30 ? 7 : data.length > 14 ? 3 : 1;
  const seriesLabel = unitLabel ? `Units · ${unitLabel}` : "Units";

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis
          dataKey="date"
          tick={AXIS_TICK}
          axisLine={AXIS_LINE}
          tickLine={false}
          interval={step - 1}
          tickFormatter={(d: string) => formatShort(d)}
        />
        <YAxis
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          width={32}
        />
        <Tooltip
          wrapperStyle={TOOLTIP_WRAPPER_STYLE}
          contentStyle={TOOLTIP_CONTENT_STYLE}
          labelStyle={TOOLTIP_LABEL_STYLE}
          itemStyle={TOOLTIP_ITEM_STYLE}
          cursor={{ fill: CHART_COLORS.teal, fillOpacity: 0.08 }}
          labelFormatter={(label) =>
            typeof label === "string" ? formatLong(label) : String(label ?? "")
          }
          formatter={(value) => [String(value ?? 0), seriesLabel]}
        />
        <Bar
          dataKey="value"
          fill={CHART_COLORS.teal}
          radius={[2, 2, 0, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
