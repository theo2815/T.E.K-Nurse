import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { BorrowExpiredPayload } from "../types";

export const subject = () => "Borrow request expired · T.E.K Nurse";

export function render({}: BorrowExpiredPayload["payload"]) {
  return (
    <EmailLayout
      title="Borrow request expired"
      preheader="Your request was not approved within the allowed window."
    >
      <Paragraph>
        Your borrow request expired before it could be approved. The reserved
        units have been released back to the available pool.
      </Paragraph>
      <Paragraph>
        You can submit a new request whenever you&apos;re ready.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/equipment`}>Request again</Button>
      </CtaRow>
    </EmailLayout>
  );
}
