import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { ConsumablePickupExpiredPayload } from "../types";

export const subject = () => "Pickup window expired · T.E.K Nurse";

export function render({}: ConsumablePickupExpiredPayload["payload"]) {
  return (
    <EmailLayout
      title="Consumable pickup window expired"
      preheader="Your approval expired before pickup. Request again if still needed."
    >
      <Paragraph>
        The 24-hour pickup window for your approved consumable request has
        passed without collection.
      </Paragraph>
      <Paragraph>
        If you still need the supplies, please submit a new request.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/consumables`}>Request again</Button>
      </CtaRow>
    </EmailLayout>
  );
}
