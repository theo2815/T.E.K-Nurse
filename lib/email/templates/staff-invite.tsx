import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, CtaRow } from "../components/Paragraph";
import type { StaffInvitePayload } from "../types";

export const subject = () => "You're invited to T.E.K Nurse staff";

export function render(p: StaffInvitePayload["payload"]) {
  const greeting = p.full_name?.trim()
    ? `Hi ${p.full_name.trim()},`
    : "Hi,";

  return (
    <EmailLayout
      title="You're invited"
      preheader="An admin invited you to join T.E.K Nurse as staff. Click below to set your password and get started."
    >
      <Paragraph>{greeting}</Paragraph>

      <Paragraph>
        A T.E.K Nurse admin has invited you to join the staff console. Click
        the button below to set your password and sign in. The link is
        single-use and expires after a short window — if it stops working,
        ask the admin to resend.
      </Paragraph>

      <CtaRow>
        <Button href={p.invite_url}>Accept invite & set password</Button>
      </CtaRow>

      <Paragraph>
        Once you accept, you&rsquo;ll land on the staff home screen. You&rsquo;ll be
        able to approve borrow and consumable requests, scan equipment at
        pickup and return, manage inventory, and read reports. Your staff
        ID is already assigned and will appear on your profile.
      </Paragraph>

      <Paragraph>
        If you weren&rsquo;t expecting this email, you can ignore it — the
        invite is harmless without your password.
      </Paragraph>
    </EmailLayout>
  );
}
