import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, QuoteBlock, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { StudentReinstatedPayload } from "../types";

export const subject = () =>
  "Your T.E.K Nurse borrowing access is restored";

export function render(p: StudentReinstatedPayload["payload"]) {
  const trimmed = p.note?.trim() ?? "";
  return (
    <EmailLayout
      title="Borrowing access restored"
      preheader="You're cleared to borrow and request again."
    >
      <Paragraph>
        Good news — staff have restored your borrowing access. You can submit
        new borrow requests, pick up reserved items, and use consumables
        again, starting now.
      </Paragraph>

      {trimmed.length > 0 && <QuoteBlock>{trimmed}</QuoteBlock>}

      <CtaRow>
        <Button href={`${appUrl()}/student/home`}>Open T.E.K Nurse</Button>
      </CtaRow>
    </EmailLayout>
  );
}
