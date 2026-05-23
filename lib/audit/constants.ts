/**
 * Client-safe audit constants. The full query layer lives in
 * `lib/supabase/queries/audit.ts` and imports the server-only Supabase
 * client; that file therefore can't be referenced from a "use client"
 * module. Anything the client filters need to import as a *value* (not just
 * a type) lives here so both sides can share without dragging
 * `next/headers` into the browser bundle.
 */

export const AUDIT_ENTITY_TYPES = [
  "users",
  "equipment_sku",
  "consumable_sku",
  "consumable_lot",
  "borrow_request",
  "consumable_request",
  "borrow_transaction",
  "consumable_usage",
] as const;

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number];

/**
 * Every action_type written by triggers/RPCs across 0003 → 0016. Grouped
 * here by domain so the filter popover can render labeled sections. Keep
 * in sync with new audit writers; an unknown action_type will still render
 * (via the humanize fallback in `AuditActionLabel`) but won't appear in
 * the filter.
 */
export const AUDIT_ACTION_GROUPS: ReadonlyArray<{
  group: string;
  actions: readonly string[];
}> = [
  {
    group: "Borrow",
    actions: [
      "borrow_request_submitted",
      "borrow_request_approved",
      "borrow_request_released",
      "borrow_request_pickup_expired",
      "borrow_expired",
      "borrow_skipped",
      "borrow_declined",
      "borrow_transaction_created",
      "walk_in_borrow",
      "borrow_pickup",
      "lost_item_returned",
      "marked_lost",
    ],
  },
  {
    group: "Consumable",
    actions: [
      "consumable_request_submitted",
      "consumable_request_approved",
      "consumable_request_released",
      "consumable_request_pickup_expired",
      "consumable_request_expired",
      "consumable_request_declined",
      "consumable_used",
      "walk_in_usage",
    ],
  },
  {
    group: "Inventory",
    actions: [
      "sku_created",
      "sku_edited",
      "sku_deleted",
      "lot_created",
      "lot_edited",
      "lot_deleted",
      "count_adjusted",
      "item_marked_lost",
      "item_marked_maintenance",
    ],
  },
  {
    group: "Account",
    actions: ["student_suspended", "student_reinstated"],
  },
];

export const AUDIT_ALL_ACTIONS: string[] = AUDIT_ACTION_GROUPS.flatMap(
  (g) => g.actions,
);
