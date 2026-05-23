import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { KeyValue } from "../components/KeyValue";
import { appUrl, formatManilaDate } from "../theme";
import type { BorrowPickedUpPayload } from "../types";

export const subject = (p: BorrowPickedUpPayload["payload"]) =>
  `Equipment borrowed — return by ${formatManilaDate(p.expected_return_date)}`;

export function render(p: BorrowPickedUpPayload["payload"]) {
  return (
    <EmailLayout
      title="Equipment picked up"
      preheader={`Return by ${formatManilaDate(p.expected_return_date)}.`}
    >
      <Paragraph>
        Your equipment is now signed out to you. Please return it by the date
        below.
      </Paragraph>
      <KeyValue
        rows={[
          {
            label: "Expected return",
            value: formatManilaDate(p.expected_return_date),
          },
        ]}
      />
      <Paragraph>
        Late returns block new borrows until the item is back at the lab.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/history`}>View history</Button>
      </CtaRow>
    </EmailLayout>
  );
}
