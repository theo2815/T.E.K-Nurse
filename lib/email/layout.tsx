import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import { appUrl, colors, fonts } from "./theme";

type EmailLayoutProps = {
  title: string;
  preheader: string;
  children: React.ReactNode;
};

export function EmailLayout({ title, preheader, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head>
        <meta name="color-scheme" content="light only" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preheader}</Preview>
      <Body style={bodyStyle}>
        <Container style={outerContainerStyle}>
          <Section style={headerStyle}>
            <Text style={eyebrowStyle}>T.E.K NURSE · LAB INVENTORY</Text>
            <Text style={brandStyle}>T.E.K Nurse</Text>
          </Section>

          <Section style={titleSectionStyle}>
            <Text style={titleStyle}>{title}</Text>
          </Section>

          <Section style={cardStyle}>{children}</Section>

          <Section style={footerStyle}>
            <Text style={footerLineStyle}>
              T.E.K Nurse · Cebu Institute of Technology
            </Text>
            <Text style={footerLineStyle}>
              Manage your notifications at{" "}
              <a
                href={`${appUrl()}/student/notifications`}
                style={footerLinkStyle}
              >
                {`${appUrl().replace(/^https?:\/\//, "")}/student/notifications`}
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle: React.CSSProperties = {
  margin: 0,
  padding: 0,
  backgroundColor: colors.mist,
  fontFamily: fonts.body,
  color: colors.navy,
  WebkitFontSmoothing: "antialiased",
};

const outerContainerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  margin: "0 auto",
  padding: "32px 16px 48px",
};

const headerStyle: React.CSSProperties = {
  backgroundColor: colors.navy,
  padding: "20px 24px",
  textAlign: "left" as const,
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: colors.cyan,
  fontFamily: fonts.mono,
  fontSize: "11px",
  letterSpacing: "0.1em",
  textTransform: "uppercase" as const,
};

const brandStyle: React.CSSProperties = {
  margin: "6px 0 0 0",
  color: colors.paper,
  fontFamily: fonts.display,
  fontStyle: "italic",
  fontSize: "26px",
  fontWeight: 800,
  letterSpacing: "-0.01em",
  lineHeight: 1,
};

const titleSectionStyle: React.CSSProperties = {
  backgroundColor: colors.paper,
  padding: "28px 24px 8px",
  borderLeft: `1.5px solid ${colors.rule}`,
  borderRight: `1.5px solid ${colors.rule}`,
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  color: colors.navy,
  fontFamily: fonts.display,
  fontStyle: "italic",
  fontSize: "24px",
  fontWeight: 800,
  lineHeight: 1.2,
  letterSpacing: "-0.005em",
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.paper,
  padding: "16px 24px 32px",
  borderLeft: `1.5px solid ${colors.rule}`,
  borderRight: `1.5px solid ${colors.rule}`,
  borderBottom: `1.5px solid ${colors.rule}`,
};

const footerStyle: React.CSSProperties = {
  padding: "20px 8px 0",
  textAlign: "center" as const,
};

const footerLineStyle: React.CSSProperties = {
  margin: "0 0 4px 0",
  color: colors.slate,
  fontFamily: fonts.body,
  fontSize: "12px",
  lineHeight: 1.5,
};

const footerLinkStyle: React.CSSProperties = {
  color: colors.tealDeep,
  textDecoration: "underline",
};
