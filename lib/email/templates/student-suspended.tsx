import * as React from "react";
import { EmailLayout } from "../layout";
import { Paragraph, QuoteBlock } from "../components/Paragraph";
import type { StudentSuspendedPayload } from "../types";

export const subject = () =>
  "Your T.E.K Nurse borrowing access is paused";

export function render(p: StudentSuspendedPayload["payload"]) {
  return (
    <EmailLayout
      title="Borrowing access paused"
      preheader="Staff have paused your borrowing access. See the reason inside."
    >
      <Paragraph>
        Your T.E.K Nurse account has been temporarily paused. You will not be
        able to submit new borrow requests, pick up reserved items, or use
        consumables until the issue below is resolved.
      </Paragraph>

      <QuoteBlock>{p.reason}</QuoteBlock>

      <Paragraph>
        Please drop by the nursing lab to speak with staff in person. This is
        not handled through the app — a short conversation is the fastest way
        to get back to active.
      </Paragraph>

      <Paragraph>
        Reply directly to this email if you cannot come by in person and need
        to discuss the issue first.
      </Paragraph>
    </EmailLayout>
  );
}
