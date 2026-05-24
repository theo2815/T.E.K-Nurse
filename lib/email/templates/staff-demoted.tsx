import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, QuoteBlock, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { StaffDemotedPayload } from "../types";

export const subject = () => "Your T.E.K Nurse role has changed";

export function render(p: StaffDemotedPayload["payload"]) {
  const trimmed = p.note?.trim() ?? "";
  return (
    <EmailLayout
      title="Role changed to student"
      preheader="Your staff access has been removed. You can still borrow and request as a student."
    >
      <Paragraph>
        An admin has moved your account back to the <strong>student</strong>{" "}
        role. You no longer have access to the staff console, approval queue,
        or inventory tools.
      </Paragraph>

      <Paragraph>
        You can still browse the catalog, submit borrow and consumable
        requests, and use the app as a student.
      </Paragraph>

      {trimmed.length > 0 && <QuoteBlock>{trimmed}</QuoteBlock>}

      <Paragraph>
        If this was unexpected, please reply to this email or drop by the
        nursing lab to speak with an admin.
      </Paragraph>

      <CtaRow>
        <Button href={`${appUrl()}/student/home`}>Open T.E.K Nurse</Button>
      </CtaRow>
    </EmailLayout>
  );
}
