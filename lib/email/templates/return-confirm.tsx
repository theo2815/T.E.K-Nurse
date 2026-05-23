import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { ReturnConfirmPayload } from "../types";

export const subject = () => "Return confirmed · T.E.K Nurse";

export function render({}: ReturnConfirmPayload["payload"]) {
  return (
    <EmailLayout
      title="Return confirmed"
      preheader="Thanks — your borrowed item has been logged as returned."
    >
      <Paragraph>
        Your item has been signed back in at the lab counter. Thanks for
        returning it.
      </Paragraph>
      <Paragraph>You&apos;re clear to make new borrow requests.</Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/history`}>View history</Button>
      </CtaRow>
    </EmailLayout>
  );
}
