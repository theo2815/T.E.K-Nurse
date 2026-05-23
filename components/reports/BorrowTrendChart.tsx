"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
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

export function BorrowTrendChart({ data }: { data: DailyPoint[] }) {
  // For long ranges, thin the X tick labels so they don't overlap. Show every
  // Nth tick depending on the range length.
  const step = data.length > 60 ? 14 : data.length > 30 ? 7 : data.length > 14 ? 3 : 1;

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
      <LineChart
        data={data}
        margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
      >
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
          cursor={{ stroke: CHART_COLORS.teal, strokeWidth: 1, strokeDasharray: "2 4" }}
          labelFormatter={(label) =>
            typeof label === "string" ? formatLong(label) : String(label ?? "")
          }
          formatter={(value) => [String(value ?? 0), "Borrows"]}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={CHART_COLORS.teal}
          strokeWidth={2}
          dot={{ r: 3, fill: CHART_COLORS.teal, stroke: CHART_COLORS.teal }}
          activeDot={{ r: 5, fill: CHART_COLORS.tealDeep, stroke: CHART_COLORS.paper, strokeWidth: 2 }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
