import * as React from "react";
import { Button as EmailButton } from "@react-email/components";
import { colors, fonts } from "../theme";

type Props = {
  href: string;
  children: React.ReactNode;
  tone?: "primary" | "danger";
};

export function Button({ href, children, tone = "primary" }: Props) {
  const bg = tone === "danger" ? colors.redDeep : colors.navy;
  return (
    <EmailButton
      href={href}
      style={{
        backgroundColor: bg,
        color: colors.paper,
        fontFamily: fonts.body,
        fontSize: "14px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        padding: "14px 22px",
        borderRadius: "0",
        textDecoration: "none",
        display: "inline-block",
        lineHeight: 1,
      }}
    >
      {children}
    </EmailButton>
  );
}
