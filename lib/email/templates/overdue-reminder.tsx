import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { KeyValue } from "../components/KeyValue";
import { appUrl, formatManilaDate } from "../theme";
import type { OverdueReminderPayload } from "../types";

type DaysOverdue = OverdueReminderPayload["payload"]["days_overdue"];

const COPY: Record<
  DaysOverdue,
  {
    subject: string;
    title: string;
    preheader: string;
    leadEmphasis: string;
    body: string;
    cta: string;
  }
> = {
  0: {
    subject: "Reminder: borrowed item due today · T.E.K Nurse",
    title: "Due today",
    preheader: "Your borrowed item is due back at the lab today.",
    leadEmphasis: "Your borrowed item is due back at the lab today.",
    body: "Please drop it off before the lab closes. If you've already returned it, you can ignore this message.",
    cta: "View history",
  },
  1: {
    subject: "Overdue: return required · T.E.K Nurse",
    title: "Overdue return",
    preheader: "Your borrowed item is 1 day overdue. Please return it as soon as possible.",
    leadEmphasis: "Your borrowed item is 1 day overdue. Please return it as soon as possible.",
    body: "While this item is out, you cannot submit new borrow requests. If the item is lost or damaged, please contact the lab nurse directly.",
    cta: "View history",
  },
  3: {
    subject: "Overdue: 3 days · please return · T.E.K Nurse",
    title: "Overdue · 3 days",
    preheader: "Your borrowed item is 3 days overdue. Please return it before it is auto-marked lost.",
    leadEmphasis: "Your borrowed item is 3 days overdue.",
    body: "If it is not returned by 7 days, the system will automatically mark it lost. Please return it now or contact the lab nurse.",
    cta: "View history",
  },
};

export const subject = (p: OverdueReminderPayload["payload"]) =>
  COPY[p.days_overdue].subject;

export function render(p: OverdueReminderPayload["payload"]) {
  const copy = COPY[p.days_overdue];
  const valueLabel = p.days_overdue === 0 ? "Due" : "Was due";
  const daysCell =
    p.days_overdue === 0
      ? "Due today"
      : `${p.days_overdue} day${p.days_overdue === 1 ? "" : "s"} overdue`;

  return (
    <EmailLayout title={copy.title} preheader={copy.preheader}>
      <Paragraph emphasis>{copy.leadEmphasis}</Paragraph>
      <KeyValue
        rows={[
          { label: valueLabel, value: formatManilaDate(p.expected_return_date) },
          { label: "Status", value: daysCell },
        ]}
      />
      <Paragraph>{copy.body}</Paragraph>
      <CtaRow>
        <Button
          href={`${appUrl()}/student/history`}
          tone={p.days_overdue === 0 ? "primary" : "danger"}
        >
          {copy.cta}
        </Button>
      </CtaRow>
    </EmailLayout>
  );
}
