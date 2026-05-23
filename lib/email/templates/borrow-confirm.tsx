import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { KeyValue } from "../components/KeyValue";
import { appUrl, formatManilaDate } from "../theme";
import type { BorrowConfirmPayload } from "../types";

export const subject = (p: BorrowConfirmPayload["payload"]) =>
  `Equipment borrowed — return by ${formatManilaDate(p.expected_return_date)}`;

export function render(p: BorrowConfirmPayload["payload"]) {
  return (
    <EmailLayout
      title="Equipment borrowed"
      preheader={`Return by ${formatManilaDate(p.expected_return_date)}.`}
    >
      <Paragraph>
        Your borrow has been recorded at the lab counter. Please return the
        equipment by the date below.
      </Paragraph>
      <KeyValue
        rows={[
          { label: "Quantity", value: `${p.quantity} unit(s)` },
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
