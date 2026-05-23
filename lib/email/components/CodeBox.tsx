import * as React from "react";
import { Section, Text } from "@react-email/components";
import { colors, fonts } from "../theme";

type Props = {
  code: string;
  caption?: string;
};

export function CodeBox({ code, caption }: Props) {
  return (
    <Section
      style={{
        backgroundColor: colors.mist,
        border: `1.5px solid ${colors.rule}`,
        padding: "20px 24px",
        textAlign: "center" as const,
        margin: "8px 0",
      }}
    >
      <Text
        style={{
          margin: 0,
          color: colors.slate,
          fontFamily: fonts.mono,
          fontSize: "11px",
          letterSpacing: "0.1em",
          textTransform: "uppercase" as const,
        }}
      >
        Pickup code
      </Text>
      <Text
        style={{
          margin: "8px 0 0 0",
          color: colors.navy,
          fontFamily: fonts.mono,
          fontSize: "36px",
          letterSpacing: "0.2em",
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        {code}
      </Text>
      {caption && (
        <Text
          style={{
            margin: "12px 0 0 0",
            color: colors.slate,
            fontFamily: fonts.body,
            fontSize: "12px",
            lineHeight: 1.4,
          }}
        >
          {caption}
        </Text>
      )}
    </Section>
  );
}
