"use client";

import { useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { markNotificationRead } from "@/app/notifications/actions";
import type { NotificationRow as TNotification } from "@/lib/supabase/queries/notifications";
import { NotificationRow } from "./NotificationRow";

type Group = { label: string; rows: TNotification[] };

function groupByDate(rows: TNotification[]): Group[] {
  if (rows.length === 0) return [];
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const sevenDaysAgo = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const today: TNotification[] = [];
  const thisWeek: TNotification[] = [];
  const earlier: TNotification[] = [];

  for (const r of rows) {
    const t = new Date(r.created_at).getTime();
    if (t >= startOfToday) today.push(r);
    else if (t >= sevenDaysAgo) thisWeek.push(r);
    else earlier.push(r);
  }

  const groups: Group[] = [];
  if (today.length) groups.push({ label: "TODAY", rows: today });
  if (thisWeek.length) groups.push({ label: "THIS WEEK", rows: thisWeek });
  if (earlier.length) groups.push({ label: "EARLIER", rows: earlier });
  return groups;
}

export function NotificationsListClient({ rows }: { rows: TNotification[] }) {
  const [optimisticReadIds, setOptimisticReadIds] = useState<Set<string>>(
    () => new Set(),
  );
  const progressRouter = useProgressRouter();

  // Self-pruning overlay (same pattern as NotificationBell): rows the server
  // confirms as read no longer match `!is_read`, so optimisticReadIds entries
  // become inert on the next render without an effect-driven reset.
  const displayRows = rows.map((r) =>
    optimisticReadIds.has(r.id) ? { ...r, is_read: true } : r,
  );

  function handleSelect(n: TNotification) {
    if (!n.is_read) {
      setOptimisticReadIds((s) => {
        const next = new Set(s);
        next.add(n.id);
        return next;
      });
      void markNotificationRead({ id: n.id });
    }
    if (n.link_url) {
      progressRouter.push(n.link_url);
    }
  }

  const groups = groupByDate(displayRows);

  return (
    <div className="flex flex-col gap-8">
      {groups.map((g) => (
        <section key={g.label} className="flex flex-col gap-3">
          <h2 className="font-mono uppercase text-[11px] tracking-[0.1em] text-slate">
            {g.label}
          </h2>
          <ul className="bg-paper border-[1.5px] border-rule rounded overflow-hidden divide-y divide-rule/60">
            {g.rows.map((n) => (
              <li key={n.id}>
                <NotificationRow
                  notification={n}
                  onSelect={handleSelect}
                  size="comfortable"
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
