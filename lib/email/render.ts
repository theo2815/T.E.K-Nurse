import { render as renderEmail } from "@react-email/render";
import type { ReactElement } from "react";
import type { EmailPayload, RenderedEmail } from "./types";

import * as BorrowApprovedWithCode from "./templates/borrow-approved-with-code";
import * as BorrowPickedUp from "./templates/borrow-picked-up";
import * as BorrowPickupExpired from "./templates/borrow-pickup-expired";
import * as BorrowExpired from "./templates/borrow-expired";
import * as BorrowSkipped from "./templates/borrow-skipped";
import * as BorrowDeclined from "./templates/borrow-declined";
import * as BorrowConfirm from "./templates/borrow-confirm";
import * as ConsumableApprovedWithCode from "./templates/consumable-approved-with-code";
import * as ConsumableApproved from "./templates/consumable-approved";
import * as ConsumablePickupExpired from "./templates/consumable-pickup-expired";
import * as ConsumableRequestExpired from "./templates/consumable-request-expired";
import * as ConsumableRequestDeclined from "./templates/consumable-request-declined";
import * as ConsumableConfirm from "./templates/consumable-confirm";
import * as ReturnConfirm from "./templates/return-confirm";
import * as ReturnDamaged from "./templates/return-damaged";
import * as ReturnLost from "./templates/return-lost";
import * as OverdueReminder from "./templates/overdue-reminder";
import * as MarkedLost from "./templates/marked-lost";
import * as StudentSuspended from "./templates/student-suspended";
import * as StudentReinstated from "./templates/student-reinstated";

type Resolved = {
  subject: string;
  jsx: ReactElement;
};

/**
 * Resolve a discriminated EmailPayload to its rendered subject + JSX. The
 * default-never branch turns "added a new template type but forgot to wire
 * the dispatcher" into a compile-time error.
 */
function resolve(p: EmailPayload): Resolved {
  switch (p.template) {
    case "borrow_approved_with_code":
      return {
        subject: BorrowApprovedWithCode.subject(p.payload),
        jsx: BorrowApprovedWithCode.render(p.payload),
      };
    case "borrow_picked_up":
      return {
        subject: BorrowPickedUp.subject(p.payload),
        jsx: BorrowPickedUp.render(p.payload),
      };
    case "borrow_pickup_expired":
      return {
        subject: BorrowPickupExpired.subject(),
        jsx: BorrowPickupExpired.render(p.payload),
      };
    case "borrow_expired":
      return {
        subject: BorrowExpired.subject(),
        jsx: BorrowExpired.render(p.payload),
      };
    case "borrow_skipped":
      return {
        subject: BorrowSkipped.subject(),
        jsx: BorrowSkipped.render(p.payload),
      };
    case "borrow_declined":
      return {
        subject: BorrowDeclined.subject(),
        jsx: BorrowDeclined.render(p.payload),
      };
    case "borrow_confirm":
      return {
        subject: BorrowConfirm.subject(p.payload),
        jsx: BorrowConfirm.render(p.payload),
      };
    case "consumable_approved_with_code":
      return {
        subject: ConsumableApprovedWithCode.subject(p.payload),
        jsx: ConsumableApprovedWithCode.render(p.payload),
      };
    case "consumable_approved":
      return {
        subject: ConsumableApproved.subject(p.payload),
        jsx: ConsumableApproved.render(p.payload),
      };
    case "consumable_pickup_expired":
      return {
        subject: ConsumablePickupExpired.subject(),
        jsx: ConsumablePickupExpired.render(p.payload),
      };
    case "consumable_request_expired":
      return {
        subject: ConsumableRequestExpired.subject(),
        jsx: ConsumableRequestExpired.render(p.payload),
      };
    case "consumable_request_declined":
      return {
        subject: ConsumableRequestDeclined.subject(),
        jsx: ConsumableRequestDeclined.render(p.payload),
      };
    case "consumable_confirm":
      return {
        subject: ConsumableConfirm.subject(),
        jsx: ConsumableConfirm.render(p.payload),
      };
    case "return_confirm":
      return {
        subject: ReturnConfirm.subject(),
        jsx: ReturnConfirm.render(p.payload),
      };
    case "return_damaged":
      return {
        subject: ReturnDamaged.subject(),
        jsx: ReturnDamaged.render(p.payload),
      };
    case "return_lost":
      return {
        subject: ReturnLost.subject(),
        jsx: ReturnLost.render(p.payload),
      };
    case "overdue_reminder":
      return {
        subject: OverdueReminder.subject(p.payload),
        jsx: OverdueReminder.render(p.payload),
      };
    case "marked_lost":
      return {
        subject: MarkedLost.subject(),
        jsx: MarkedLost.render(p.payload),
      };
    case "student_suspended":
      return {
        subject: StudentSuspended.subject(),
        jsx: StudentSuspended.render(p.payload),
      };
    case "student_reinstated":
      return {
        subject: StudentReinstated.subject(),
        jsx: StudentReinstated.render(p.payload),
      };
    default: {
      const _exhaustive: never = p;
      throw new Error(
        `renderEmail: unknown template "${(_exhaustive as EmailPayload).template}"`,
      );
    }
  }
}

export async function renderEmailPayload(
  payload: EmailPayload,
): Promise<RenderedEmail> {
  const { subject, jsx } = resolve(payload);
  const [html, text] = await Promise.all([
    renderEmail(jsx, { pretty: false }),
    renderEmail(jsx, { plainText: true }),
  ]);
  return { subject, html, text };
}
