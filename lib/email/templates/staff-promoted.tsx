import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, QuoteBlock, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { StaffPromotedPayload } from "../types";

export const subject = () => "You are now T.E.K Nurse staff";

export function render(p: StaffPromotedPayload["payload"]) {
  const trimmed = p.note?.trim() ?? "";
  return (
    <EmailLayout
      title="You are now staff"
      preheader="An admin promoted your account. You can now approve requests and manage inventory."
    >
      <Paragraph>
        An admin has promoted your account to <strong>staff</strong> on
        T.E.K Nurse. You can now approve borrow and consumable requests, scan
        equipment at pickup and return, manage inventory, and access reports.
      </Paragraph>

      <Paragraph>
        Your staff ID is <strong>{p.staff_id}</strong>. Keep this for your
        records — it appears alongside your actions in the audit log.
      </Paragraph>

      {trimmed.length > 0 && <QuoteBlock>{trimmed}</QuoteBlock>}

      <CtaRow>
        <Button href={`${appUrl()}/staff/home`}>Open the staff console</Button>
      </CtaRow>
    </EmailLayout>
  );
}
