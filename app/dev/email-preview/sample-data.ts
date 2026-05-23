import type { EmailPayload, TemplateName } from "@/lib/email/types";

/**
 * One realistic payload per template, used by the dev preview routes.
 * Values mirror the shape of real seed data (UUIDs, ISO timestamps,
 * Asia/Manila dates). Pickup codes follow the public.generate_pickup_code()
 * 6-char alphanumeric format.
 */
export const sampleData: Record<TemplateName, EmailPayload> = {
  borrow_approved_with_code: {
    template: "borrow_approved_with_code",
    payload: {
      request_id: "40000000-0000-0000-0000-000000000001",
      pickup_code: "A7K9QM",
      pickup_expires_at: "2026-05-24T16:30:00+08:00",
      quantity: 2,
    },
  },
  borrow_picked_up: {
    template: "borrow_picked_up",
    payload: {
      request_id: "40000000-0000-0000-0000-000000000002",
      expected_return_date: "2026-05-30",
    },
  },
  borrow_pickup_expired: {
    template: "borrow_pickup_expired",
    payload: {
      request_id: "40000000-0000-0000-0000-000000000003",
    },
  },
  borrow_expired: {
    template: "borrow_expired",
    payload: {
      request_id: "40000000-0000-0000-0000-000000000004",
    },
  },
  borrow_skipped: {
    template: "borrow_skipped",
    payload: {
      request_id: "40000000-0000-0000-0000-000000000005",
    },
  },
  borrow_declined: {
    template: "borrow_declined",
    payload: {
      request_id: "40000000-0000-0000-0000-000000000006",
      decline_reason:
        "Equipment is being inventoried this week. Please re-request next Monday.",
    },
  },
  borrow_confirm: {
    template: "borrow_confirm",
    payload: {
      transaction_id: "40000000-0000-0000-0000-000000000007",
      quantity: 1,
      expected_return_date: "2026-05-30",
    },
  },
  consumable_approved_with_code: {
    template: "consumable_approved_with_code",
    payload: {
      request_id: "40000000-0000-0000-0000-000000000008",
      pickup_code: "P2X8YR",
      pickup_expires_at: "2026-05-24T16:30:00+08:00",
      quantity: 5,
    },
  },
  consumable_pickup_expired: {
    template: "consumable_pickup_expired",
    payload: {
      request_id: "40000000-0000-0000-0000-000000000009",
    },
  },
  consumable_request_expired: {
    template: "consumable_request_expired",
    payload: {
      request_id: "40000000-0000-0000-0000-00000000000a",
    },
  },
  consumable_request_declined: {
    template: "consumable_request_declined",
    payload: {
      request_id: "40000000-0000-0000-0000-00000000000b",
      decline_reason:
        "Out of stock until next delivery on Wednesday. Please re-request.",
    },
  },
  consumable_confirm: {
    template: "consumable_confirm",
    payload: {
      usage_id: "50000000-0000-0000-0000-000000000001",
      sku: "Sterile gauze pad (4×4)",
      quantity: 10,
    },
  },
  consumable_approved: {
    template: "consumable_approved",
    payload: {
      usage_id: "50000000-0000-0000-0000-000000000002",
      sku: "Disposable nitrile gloves (M)",
      quantity: 6,
    },
  },
  return_confirm: {
    template: "return_confirm",
    payload: {
      transaction_id: "40000000-0000-0000-0000-00000000000c",
    },
  },
  return_damaged: {
    template: "return_damaged",
    payload: {
      transaction_id: "40000000-0000-0000-0000-00000000000d",
    },
  },
  return_lost: {
    template: "return_lost",
    payload: {
      transaction_id: "40000000-0000-0000-0000-00000000000e",
    },
  },
  overdue_reminder: {
    template: "overdue_reminder",
    payload: {
      transaction_id: "40000000-0000-0000-0000-00000000000f",
      expected_return_date: "2026-05-20",
    },
  },
  marked_lost: {
    template: "marked_lost",
    payload: {
      transaction_id: "40000000-0000-0000-0000-000000000010",
    },
  },
};

export const templateGroups: Array<{ label: string; templates: TemplateName[] }> = [
  {
    label: "BORROW",
    templates: [
      "borrow_approved_with_code",
      "borrow_picked_up",
      "borrow_pickup_expired",
      "borrow_expired",
      "borrow_skipped",
      "borrow_declined",
      "borrow_confirm",
    ],
  },
  {
    label: "CONSUMABLE",
    templates: [
      "consumable_approved_with_code",
      "consumable_approved",
      "consumable_pickup_expired",
      "consumable_request_expired",
      "consumable_request_declined",
      "consumable_confirm",
    ],
  },
  {
    label: "RETURN",
    templates: ["return_confirm", "return_damaged", "return_lost"],
  },
  {
    label: "OVERDUE / LOST",
    templates: ["overdue_reminder", "marked_lost"],
  },
];
