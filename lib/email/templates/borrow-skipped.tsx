import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { BorrowSkippedPayload } from "../types";

export const subject = () => "Borrow request skipped · T.E.K Nurse";

export function render({}: BorrowSkippedPayload["payload"]) {
  return (
    <EmailLayout
      title="Request skipped"
      preheader="Staff issued the units to another borrower. Please re-request."
    >
      <Paragraph>
        The units you requested were issued to another borrower at the counter
        before your request could be approved. Your request has been marked as
        skipped.
      </Paragraph>
      <Paragraph>
        If you still need the equipment, please submit a new request — stock
        levels will reflect the current availability.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/equipment`}>Request again</Button>
      </CtaRow>
    </EmailLayout>
  );
}
