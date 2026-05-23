import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { KeyValue } from "../components/KeyValue";
import { appUrl, formatManilaDate } from "../theme";
import type { OverdueReminderPayload } from "../types";

function daysOverdue(expectedIso: string, now = new Date()): number {
  const expected = new Date(expectedIso);
  if (Number.isNaN(expected.getTime())) return 0;
  const ms = now.getTime() - expected.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export const subject = () => "Overdue: return required · T.E.K Nurse";

export function render(p: OverdueReminderPayload["payload"]) {
  const days = daysOverdue(p.expected_return_date);
  return (
    <EmailLayout
      title="Overdue return"
      preheader="Your borrowed item is overdue. Please return it as soon as possible."
    >
      <Paragraph emphasis>
        Your borrowed item is overdue. Please return it as soon as possible.
      </Paragraph>
      <KeyValue
        rows={[
          {
            label: "Was due",
            value: formatManilaDate(p.expected_return_date),
          },
          {
            label: "Days overdue",
            value: `${days} day${days === 1 ? "" : "s"}`,
          },
        ]}
      />
      <Paragraph>
        While this item is out, you cannot submit new borrow requests. If the
        item is lost or damaged, please contact the lab nurse directly.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/history`} tone="danger">
          View history
        </Button>
      </CtaRow>
    </EmailLayout>
  );
}
