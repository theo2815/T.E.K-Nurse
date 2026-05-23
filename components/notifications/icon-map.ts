import {
  AlertTriangle,
  Beaker,
  Bell,
  CheckCircle2,
  Clock,
  Inbox,
  Package,
  RotateCcw,
  Ticket,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type IconTone = "teal" | "red-deep" | "green" | "slate";

type Mapping = { Icon: LucideIcon; tone: IconTone };

/**
 * Maps `notification.type` strings (enqueued by DB triggers in
 * supabase/migrations/0003 + 0005 + 0009) to an icon + tone for inbox rows.
 * Unknown types fall back to a neutral bell so new trigger types never crash
 * the surface.
 */
export function iconFor(type: string): Mapping {
  switch (type) {
    // Student-facing — pickup-ready + release flow
    case "borrow_approved":
    case "borrow_request_released":
    case "borrow_picked_up":
      return { Icon: Ticket, tone: "teal" };

    // Student-facing — walk-in confirmations
    case "borrow_confirm":
      return { Icon: Package, tone: "teal" };
    case "consumable_confirm":
    case "consumable_approved":
      return { Icon: Beaker, tone: "teal" };

    // Student-facing — return / recovery (success)
    case "return_confirm":
      return { Icon: CheckCircle2, tone: "green" };
    case "lost_item_returned":
      return { Icon: RotateCcw, tone: "green" };

    // Student-facing — negative outcomes
    case "borrow_skipped":
      return { Icon: AlertTriangle, tone: "red-deep" };
    case "borrow_declined":
    case "consumable_request_declined":
      return { Icon: XCircle, tone: "red-deep" };
    case "overdue_reminder":
    case "marked_lost":
      return { Icon: AlertTriangle, tone: "red-deep" };

    // Student-facing — expiry (neutral, time-based)
    case "borrow_expired":
    case "consumable_request_expired":
    case "borrow_request_pickup_expired":
    case "consumable_request_pickup_expired":
      return { Icon: Clock, tone: "slate" };

    // Staff-facing
    case "borrow_request_new":
    case "consumable_request_new":
      return { Icon: Inbox, tone: "teal" };
    // Low-stock + expiring: warning, escalates to overdue red per the
    // post-Phase-2 color philosophy ("Red: OVERDUE / LOST / LOW STOCK only").
    case "consumable_low_stock":
    case "equipment_low_stock":
    case "consumable_expiring":
      return { Icon: AlertTriangle, tone: "red-deep" };

    default:
      return { Icon: Bell, tone: "slate" };
  }
}

export const TONE_TEXT: Record<IconTone, string> = {
  teal: "text-teal",
  "red-deep": "text-red-deep",
  green: "text-green",
  slate: "text-slate",
};

export const TONE_BG: Record<IconTone, string> = {
  teal: "bg-teal/10",
  "red-deep": "bg-red-deep/10",
  green: "bg-green/10",
  slate: "bg-rule/30",
};
