import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { KeyValue } from "../components/KeyValue";
import { appUrl } from "../theme";
import type { ConsumableConfirmPayload } from "../types";

export const subject = () => "Consumables logged · T.E.K Nurse";

export function render(p: ConsumableConfirmPayload["payload"]) {
  return (
    <EmailLayout
      title="Consumables logged"
      preheader={`${p.quantity} × ${p.sku} recorded at the lab counter.`}
    >
      <Paragraph>
        Your consumable usage has been recorded at the lab counter.
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
