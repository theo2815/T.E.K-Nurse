"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useProgressRouter } from "@/lib/use-progress-router";
import { markNotificationRead } from "@/app/notifications/actions";
import type { NotificationRow as TNotification } from "@/lib/supabase/queries/notifications";
import { NotificationsPopover } from "./NotificationsPopover";

type Props = {
  userId: string;
  initialUnreadCount: number;
  initialRows: TNotification[];
  fullPageHref: string;
};

export function NotificationBell({
  userId,
  initialUnreadCount,
  initialRows,
  fullPageHref,
}: Props) {
  const [open, setOpen] = useState(false);
  const [optimisticReadIds, setOptimisticReadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const progressRouter = useProgressRouter();

  // Realtime subscription. Mirrors components/loans/StaffLoansRealtime.tsx
  // intentionally — raw next/navigation useRouter so background pushes from
  // other tabs/users don't trigger the global progress bar.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notification",
          filter: `user_id=eq.${userId}`,
        },
        () => router.refresh(),
      );
    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  // Self-pruning optimistic overlay: when the server confirms a row is read
  // (initialRows gets `is_read: true` for that id), the filter below stops
  // counting it as an optimistic decrement on the next render — no useEffect
  // reset needed. Stale ids stay in the Set harmlessly until the bell
  // unmounts (logout / hard refresh).
  const displayRows = initialRows.map((r) =>
    optimisticReadIds.has(r.id) ? { ...r, is_read: true } : r,
  );
  const optimisticDecrement = initialRows.filter(
    (r) => !r.is_read && optimisticReadIds.has(r.id),
  ).length;
  const displayCount = Math.max(0, initialUnreadCount - optimisticDecrement);
  const badgeLabel = displayCount > 99 ? "99+" : String(displayCount);

  function handleSelect(n: TNotification) {
    if (!n.is_read) {
      setOptimisticReadIds((s) => {
        const next = new Set(s);
        next.add(n.id);
        return next;
      });
      // Fire-and-forget; revalidation + realtime will reconcile state.
      void markNotificationRead({ id: n.id });
    }
    setOpen(false);
    if (n.link_url) {
      progressRouter.push(n.link_url);
    }
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={
          displayCount > 0
            ? `Notifications, ${badgeLabel} unread`
            : "Notifications"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative text-slate hover:text-navy transition-colors p-1"
      >
        <Bell size={22} strokeWidth={1.75} />
        {displayCount > 0 && (
          <span
            aria-hidden
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-deep text-white font-display italic font-bold text-[11px] flex items-center justify-center px-1 leading-none"
          >
            {badgeLabel}
          </span>
        )}
      </button>

      {open && (
        <NotificationsPopover
          anchorRef={triggerRef}
          rows={displayRows}
          unreadCount={displayCount}
          fullPageHref={fullPageHref}
          onSelect={handleSelect}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
