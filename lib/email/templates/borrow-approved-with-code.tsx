import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { CodeBox } from "../components/CodeBox";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { KeyValue } from "../components/KeyValue";
import { appUrl, formatManilaDateTime } from "../theme";
import type { BorrowApprovedWithCodePayload } from "../types";

export const subject = (p: BorrowApprovedWithCodePayload["payload"]) =>
  `Pickup code ${p.pickup_code} · T.E.K Nurse`;

export function render(p: BorrowApprovedWithCodePayload["payload"]) {
  const href = `${appUrl()}/student/requests/${p.request_id}`;
  return (
    <EmailLayout
      title="Your borrow request is approved"
      preheader={`Show code ${p.pickup_code} at the lab to collect your equipment.`}
    >
      <Paragraph>
        Show the pickup code below to the lab nurse to collect your equipment.
      </Paragraph>
      <CodeBox
        code={p.pickup_code}
        caption={`Valid until ${formatManilaDateTime(p.pickup_expires_at)}. After this window the approval expires and the units return to the available pool.`}
      />
      <KeyValue
        rows={[
          { label: "Quantity", value: `${p.quantity} unit(s)` },
          {
            label: "Pickup deadline",
            value: formatManilaDateTime(p.pickup_expires_at),
          },
        ]}
      />
      <CtaRow>
        <Button href={href}>View request</Button>
      </CtaRow>
    </EmailLayout>
  );
}
