/**
 * Recharts theme tokens for Clinical Console. Mirrors the CSS variables from
 * app/globals.css so charts read as native to the rest of the app. Never use
 * rainbow palettes — only navy / teal / red / green per Design Direction.
 */

export const CHART_COLORS = {
  navy: "#1F3A6E",
  navyDeep: "#152849",
  teal: "#38B6BC",
  tealDeep: "#2A8E94",
  cyan: "#87D1D5",
  paper: "#F8FAFC",
  mist: "#F0F4F8",
  slate: "#475569",
  rule: "#CBD5E1",
  red: "#E53935",
  redDeep: "#B91C1C",
  green: "#0EA968",
} as const;

export const CHART_FONT = {
  mono: "var(--font-mono), ui-monospace, monospace",
  body: "var(--font-body), ui-sans-serif, system-ui",
} as const;

/** Common axis styling — small mono caps, slate. */
export const AXIS_TICK = {
  fontFamily: CHART_FONT.mono,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  fill: CHART_COLORS.slate,
} as const;

export const AXIS_LINE = {
  stroke: CHART_COLORS.rule,
  strokeWidth: 1,
} as const;

export const GRID = {
  stroke: CHART_COLORS.rule,
  strokeDasharray: "2 4",
  strokeOpacity: 0.7,
} as const;

export const TOOLTIP_WRAPPER_STYLE: React.CSSProperties = {
  outline: "none",
};

export const TOOLTIP_CONTENT_STYLE: React.CSSProperties = {
  backgroundColor: CHART_COLORS.paper,
  border: `1.5px solid ${CHART_COLORS.rule}`,
  borderRadius: 8,
  padding: "10px 14px",
  fontFamily: CHART_FONT.body,
  fontSize: 13,
  color: CHART_COLORS.navy,
  boxShadow: "none",
};

export const TOOLTIP_LABEL_STYLE: React.CSSProperties = {
  fontFamily: CHART_FONT.mono,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: CHART_COLORS.slate,
  marginBottom: 4,
};

export const TOOLTIP_ITEM_STYLE: React.CSSProperties = {
  color: CHART_COLORS.navy,
  fontWeight: 600,
};
