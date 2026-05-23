/**
 * Email template payload types.
 *
 * Each variant mirrors EXACTLY what `public.enqueue_email(...)` is called
 * with from a Postgres trigger. The migration + line for the authoritative
 * callsite is documented on each variant. Do not invent fields — if a
 * renderer needs more, the trigger must enqueue it.
 */

export type BorrowApprovedWithCodePayload = {
  /** supabase/migrations/0009_pickup_code.sql:185 */
  template: "borrow_approved_with_code";
  payload: {
    request_id: string;
    pickup_code: string;
    pickup_expires_at: string;
    quantity: number;
  };
};

export type BorrowPickedUpPayload = {
  /** supabase/migrations/0009_pickup_code.sql:227 */
  template: "borrow_picked_up";
  payload: {
    request_id: string;
    expected_return_date: string;
  };
};

export type BorrowPickupExpiredPayload = {
  /** supabase/migrations/0009_pickup_code.sql:251 */
  template: "borrow_pickup_expired";
  payload: {
    request_id: string;
  };
};

export type BorrowExpiredPayload = {
  /** supabase/migrations/0009_pickup_code.sql:280 (status=EXPIRED branch) */
  template: "borrow_expired";
  payload: {
    request_id: string;
  };
};

export type BorrowSkippedPayload = {
  /** supabase/migrations/0009_pickup_code.sql:280 (status=SKIPPED branch) */
  template: "borrow_skipped";
  payload: {
    request_id: string;
  };
};

export type BorrowDeclinedPayload = {
  /** supabase/migrations/0009_pickup_code.sql:291 */
  template: "borrow_declined";
  payload: {
    request_id: string;
    decline_reason: string;
  };
};

export type BorrowConfirmPayload = {
  /** supabase/migrations/0003_functions_and_triggers.sql:342 (walk-in lend) */
  template: "borrow_confirm";
  payload: {
    transaction_id: string;
    quantity: number;
    expected_return_date: string;
  };
};

export type ConsumableApprovedWithCodePayload = {
  /** supabase/migrations/0009_pickup_code.sql:391 */
  template: "consumable_approved_with_code";
  payload: {
    request_id: string;
    pickup_code: string;
    pickup_expires_at: string;
    quantity: number;
  };
};

export type ConsumablePickupExpiredPayload = {
  /** supabase/migrations/0009_pickup_code.sql:431 */
  template: "consumable_pickup_expired";
  payload: {
    request_id: string;
  };
};

export type ConsumableRequestExpiredPayload = {
  /** supabase/migrations/0009_pickup_code.sql:449 */
  template: "consumable_request_expired";
  payload: {
    request_id: string;
  };
};

export type ConsumableRequestDeclinedPayload = {
  /** supabase/migrations/0009_pickup_code.sql:459 */
  template: "consumable_request_declined";
  payload: {
    request_id: string;
    decline_reason: string;
  };
};

export type ConsumableConfirmPayload = {
  /** supabase/migrations/0003_functions_and_triggers.sql:677 (walk-in usage) */
  template: "consumable_confirm";
  payload: {
    usage_id: string;
    sku: string;
    quantity: number;
  };
};

export type ConsumableApprovedPayload = {
  /**
   * supabase/migrations/0003_functions_and_triggers.sql:685
   *
   * Despite the legacy name, this fires AFTER the student presents their
   * pickup code and the consumable is RELEASED (i.e. usage row inserted with
   * source_request_id IS NOT NULL). Semantically parallel to
   * `borrow_picked_up` for the consumable side.
   */
  template: "consumable_approved";
  payload: {
    usage_id: string;
    sku: string;
    quantity: number;
  };
};

export type ReturnConfirmPayload = {
  /** supabase/migrations/0006_return_condition.sql:181 */
  template: "return_confirm";
  payload: {
    transaction_id: string;
  };
};

export type ReturnDamagedPayload = {
  /** supabase/migrations/0006_return_condition.sql:166 */
  template: "return_damaged";
  payload: {
    transaction_id: string;
  };
};

export type ReturnLostPayload = {
  /** supabase/migrations/0006_return_condition.sql:174 */
  template: "return_lost";
  payload: {
    transaction_id: string;
  };
};

export type OverdueReminderPayload = {
  /** supabase/migrations/0006_return_condition.sql:204 */
  template: "overdue_reminder";
  payload: {
    transaction_id: string;
    expected_return_date: string;
  };
};

export type MarkedLostPayload = {
  /** supabase/migrations/0006_return_condition.sql:220 */
  template: "marked_lost";
  payload: {
    transaction_id: string;
  };
};

export type EmailPayload =
  | BorrowApprovedWithCodePayload
  | BorrowPickedUpPayload
  | BorrowPickupExpiredPayload
  | BorrowExpiredPayload
  | BorrowSkippedPayload
  | BorrowDeclinedPayload
  | BorrowConfirmPayload
  | ConsumableApprovedWithCodePayload
  | ConsumablePickupExpiredPayload
  | ConsumableRequestExpiredPayload
  | ConsumableRequestDeclinedPayload
  | ConsumableConfirmPayload
  | ConsumableApprovedPayload
  | ReturnConfirmPayload
  | ReturnDamagedPayload
  | ReturnLostPayload
  | OverdueReminderPayload
  | MarkedLostPayload;

export type TemplateName = EmailPayload["template"];

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};
