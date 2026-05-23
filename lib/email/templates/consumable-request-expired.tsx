import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { ConsumableRequestExpiredPayload } from "../types";

export const subject = () => "Consumable request expired · T.E.K Nurse";

export function render({}: ConsumableRequestExpiredPayload["payload"]) {
  return (
    <EmailLayout
      title="Consumable request expired"
      preheader="Your request was not approved within the allowed window."
    >
      <Paragraph>
        Your consumable request expired before it could be approved.
      </Paragraph>
      <Paragraph>
        You can submit a new request whenever you&apos;re ready.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/consumables`}>Request again</Button>
      </CtaRow>
    </EmailLayout>
  );
}
