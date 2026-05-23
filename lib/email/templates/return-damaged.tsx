import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { ReturnDamagedPayload } from "../types";

export const subject = () => "Item returned — flagged for maintenance";

export function render({}: ReturnDamagedPayload["payload"]) {
  return (
    <EmailLayout
      title="Returned — flagged for maintenance"
      preheader="Your item was returned and flagged for maintenance."
    >
      <Paragraph>
        Your item has been signed back in at the lab counter, but the lab nurse
        has flagged it for maintenance. The unit is out of circulation while it
        is inspected.
      </Paragraph>
      <Paragraph>
        If you have context the lab should know about, please drop by the lab.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/history`}>View history</Button>
      </CtaRow>
    </EmailLayout>
  );
}
