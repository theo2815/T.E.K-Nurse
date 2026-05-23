import * as React from "react";
import { Text } from "@react-email/components";
import { colors, fonts } from "../theme";

type Props = {
  children: React.ReactNode;
  emphasis?: boolean;
};

export function Paragraph({ children, emphasis = false }: Props) {
  return (
    <Text
      style={{
        margin: "12px 0",
        color: emphasis ? colors.navyDeep : colors.navy,
        fontFamily: fonts.body,
        fontSize: emphasis ? "16px" : "15px",
        lineHeight: 1.6,
        fontWeight: emphasis ? 600 : 400,
      }}
    >
      {children}
    </Text>
  );
}

type QuoteProps = {
  children: React.ReactNode;
};

export function QuoteBlock({ children }: QuoteProps) {
  return (
    <Text
      style={{
        margin: "16px 0",
        padding: "12px 16px",
        borderLeft: `3px solid ${colors.teal}`,
        backgroundColor: colors.mist,
        color: colors.navy,
        fontFamily: fonts.body,
        fontStyle: "italic",
        fontSize: "14px",
        lineHeight: 1.6,
      }}
    >
      {children}
    </Text>
  );
}

type CtaRowProps = {
  children: React.ReactNode;
};

export function CtaRow({ children }: CtaRowProps) {
  return (
    <div style={{ margin: "20px 0 4px 0", textAlign: "left" as const }}>
      {children}
    </div>
  );
}
