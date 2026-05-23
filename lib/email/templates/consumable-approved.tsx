import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { KeyValue } from "../components/KeyValue";
import { appUrl } from "../theme";
import type { ConsumableApprovedPayload } from "../types";

export const subject = (p: ConsumableApprovedPayload["payload"]) =>
  `Consumables issued · ${p.sku}`;

export function render(p: ConsumableApprovedPayload["payload"]) {
  return (
    <EmailLayout
      title="Consumables issued"
      preheader={`${p.quantity} × ${p.sku} released after pickup-code check.`}
    >
      <Paragraph>
        Your pickup code has been verified at the lab counter and your
        consumables have been issued. Usage is logged against your record.
      </Paragraph>
      <KeyValue
        rows={[
          { label: "Item", value: p.sku },
          { label: "Quantity", value: `${p.quantity}` },
        ]}
      />
      <CtaRow>
        <Button href={`${appUrl()}/student/history`}>View history</Button>
      </CtaRow>
    </EmailLayout>
  );
}
