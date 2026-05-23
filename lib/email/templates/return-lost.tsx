import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { ReturnLostPayload } from "../types";

export const subject = () => "Item flagged as lost on return";

export function render({}: ReturnLostPayload["payload"]) {
  return (
    <EmailLayout
      title="Item flagged as lost"
      preheader="Please contact the lab nurse."
    >
      <Paragraph emphasis>
        Your borrowed item could not be returned and has been flagged as lost.
      </Paragraph>
      <Paragraph>
        Please contact the lab nurse as soon as possible to discuss next steps.
        New borrow requests are blocked until this is resolved.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/history`} tone="danger">
          View history
        </Button>
      </CtaRow>
    </EmailLayout>
  );
}
