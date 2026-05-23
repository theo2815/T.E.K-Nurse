import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { MarkedLostPayload } from "../types";

export const subject = () => "Borrowed item marked as lost";

export function render({}: MarkedLostPayload["payload"]) {
  return (
    <EmailLayout
      title="Item marked as lost"
      preheader="Please contact the lab nurse."
    >
      <Paragraph emphasis>
        Your borrowed item has been marked as LOST.
      </Paragraph>
      <Paragraph>
        Please contact the lab nurse as soon as possible to discuss
        replacement. New borrow requests are blocked until this is resolved.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/history`} tone="danger">
          View history
        </Button>
      </CtaRow>
    </EmailLayout>
  );
}
