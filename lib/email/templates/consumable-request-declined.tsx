import * as React from "react";
import { EmailLayout } from "../layout";
import { Button } from "../components/Button";
import { Paragraph, QuoteBlock, CtaRow } from "../components/Paragraph";
import { appUrl } from "../theme";
import type { ConsumableRequestDeclinedPayload } from "../types";

export const subject = () => "Consumable request declined · T.E.K Nurse";

export function render(p: ConsumableRequestDeclinedPayload["payload"]) {
  return (
    <EmailLayout
      title="Consumable request declined"
      preheader="Staff declined your request. See the reason inside."
    >
      <Paragraph>
        Staff have reviewed your consumable request and were not able to
        approve it.
      </Paragraph>
      <QuoteBlock>{p.decline_reason}</QuoteBlock>
      <Paragraph>
        If you have questions, please drop by the lab. You can submit a new
        request once the underlying issue is resolved.
      </Paragraph>
      <CtaRow>
        <Button href={`${appUrl()}/student/requests/${p.request_id}`}>
          View request
        </Button>
      </CtaRow>
    </EmailLayout>
  );
}
