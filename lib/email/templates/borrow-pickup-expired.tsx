import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { BorrowPickupExpiredPayload } from "../types";

export const subject = () => "Pickup window expired · T.E.K Nurse";

export function render({}: BorrowPickupExpiredPayload["payload"]) {
  return (
    <EmailLayout
      title="Pickup window expired"
      preheader="Your approval expired before pickup. Request again if you still need the item."
    >
      <Paragraph>
        The 24-hour pickup window for your approved borrow request has passed
        without collection. The units have been returned to the available pool.
      </Paragraph>
      <Paragraph>
        If you still need the equipment, please submit a new request.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/equipment`}>Request again</Button>
      </CtaRow>
    </EmailLayout>
  );
}
