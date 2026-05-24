/**
 * Human-readable labels for the lowercase action_type values written across
 * the migration suite (0003 → 0016). Unknown action_types fall back through
 * the humanize() helper so a future trigger that ships a new action_type
 * still renders something sensible (just not pretty) until this map is
 * updated.
 */

const LABELS: Record<string, string> = {
  // Borrow flow
  borrow_request_submitted: "Borrow request submitted",
  borrow_request_approved: "Borrow request approved",
  borrow_request_released: "Borrow released",
  borrow_request_pickup_expired: "Borrow pickup expired",
  borrow_expired: "Borrow request expired",
  borrow_skipped: "Borrow request skipped",
  borrow_declined: "Borrow request declined",
  borrow_transaction_created: "Borrow created",
  walk_in_borrow: "Walk-in borrow",
  borrow_pickup: "Borrow picked up",
  lost_item_returned: "Lost item returned",
  marked_lost: "Marked lost",

  // Consumable flow
  consumable_request_submitted: "Consumable request submitted",
  consumable_request_approved: "Consumable request approved",
  consumable_request_released: "Consumable released",
  consumable_request_pickup_expired: "Consumable pickup expired",
  consumable_request_expired: "Consumable request expired",
  consumable_request_declined: "Consumable request declined",
  consumable_used: "Consumable used",
  walk_in_usage: "Walk-in usage",

  // Inventory management
  sku_created: "SKU created",
  sku_edited: "SKU edited",
  sku_deleted: "SKU deleted",
  lot_created: "Lot created",
  lot_edited: "Lot edited",
  lot_deleted: "Lot deleted",
  count_adjusted: "Count adjusted",
  item_marked_lost: "Item marked lost",
  item_marked_maintenance: "Item marked for maintenance",
  stock_received: "Stock received",

  // Account
  student_suspended: "Student suspended",
  student_reinstated: "Student reinstated",
  user_promoted_to_staff: "Promoted to staff",
  user_demoted_to_student: "Demoted to student",
};

export function actionLabel(actionType: string): string {
  const normalized = actionType.toLowerCase();
  return LABELS[normalized] ?? humanize(normalized);
}

function humanize(s: string): string {
  if (!s) return "Unknown action";
  return s
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Tonal classification used by the row chip and the filter popover. Default
 * = neutral; alert = removal / expiry / failure tones; success = positive
 * transitions like approvals.
 */
export type ActionTone = "default" | "alert" | "success";

const TONE: Record<string, ActionTone> = {
  borrow_request_approved: "success",
  consumable_request_approved: "success",
  borrow_request_released: "success",
  consumable_request_released: "success",
  borrow_pickup: "success",
  consumable_used: "default",
  student_reinstated: "success",
  borrow_declined: "alert",
  consumable_request_declined: "alert",
  borrow_expired: "alert",
  consumable_request_expired: "alert",
  borrow_request_pickup_expired: "alert",
  consumable_request_pickup_expired: "alert",
  borrow_skipped: "alert",
  marked_lost: "alert",
  item_marked_lost: "alert",
  student_suspended: "alert",
  user_promoted_to_staff: "success",
  stock_received: "success",
  user_demoted_to_student: "alert",
  sku_deleted: "alert",
  lot_deleted: "alert",
};

export function actionTone(actionType: string): ActionTone {
  return TONE[actionType.toLowerCase()] ?? "default";
}
