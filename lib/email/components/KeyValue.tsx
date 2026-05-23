import * as React from "react";
import { Section, Text } from "@react-email/components";
import { colors, fonts } from "../theme";

type Row = {
  label: string;
  value: string;
};

type Props = {
  rows: Row[];
};

export function KeyValue({ rows }: Props) {
  return (
    <Section
      style={{
        borderTop: `1px solid ${colors.rule}`,
        borderBottom: `1px solid ${colors.rule}`,
        padding: "4px 0",
        margin: "8px 0",
      }}
    >
      {rows.map((r, i) => (
        <table
          key={`${r.label}-${i}`}
          width="100%"
          cellPadding={0}
          cellSpacing={0}
          role="presentation"
          style={{
            borderBottom:
              i < rows.length - 1 ? `1px solid ${colors.rule}` : "none",
            padding: "10px 0",
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  width: "40%",
                  verticalAlign: "top",
                  padding: "0 12px 0 0",
                }}
              >
                <Text style={labelStyle}>{r.label}</Text>
              </td>
              <td style={{ verticalAlign: "top" }}>
                <Text style={valueStyle}>{r.value}</Text>
              </td>
            </tr>
          </tbody>
        </table>
      ))}
    </Section>
  );
}

const labelStyle: React.CSSProperties = {
  margin: 0,
  color: colors.slate,
  fontFamily: fonts.mono,
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const valueStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontFamily: fonts.body,
  fontSize: "14px",
  fontWeight: 500,
  lineHeight: 1.4,
};
