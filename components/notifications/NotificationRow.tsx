"use client";

import { TONE_BG, TONE_TEXT, iconFor } from "./icon-map";
import { timeAgo } from "@/lib/time-ago";
import type { NotificationRow as TNotification } from "@/lib/supabase/queries/notifications";

type Props = {
  notification: TNotification;
  /** Parent owns optimistic state, server-action dispatch, and navigation. */
  onSelect: (n: TNotification) => void;
  /** `compact` = inside popover, `comfortable` = full page row. */
  size?: "compact" | "comfortable";
};

export function NotificationRow({
  notification: n,
  onSelect,
  size = "compact",
}: Props) {
  const { Icon, tone } = iconFor(n.type);
  const isUnread = !n.is_read;

  return (
    <button
      type="button"
      onClick={() => onSelect(n)}
      className={[
        "w-full text-left flex items-start gap-3 transition-colors",
        size === "compact" ? "px-4 py-3" : "px-5 py-4",
        "hover:bg-mist focus:outline-none focus:bg-mist",
      ].join(" ")}
      aria-label={`${isUnread ? "Unread: " : ""}${n.title}`}
    >
      <span
        aria-hidden
        className={`shrink-0 rounded-full ${TONE_BG[tone]} flex items-center justify-center ${
          size === "compact" ? "w-9 h-9" : "w-10 h-10"
        }`}
      >
        <Icon size={size === "compact" ? 18 : 20} strokeWidth={1.75} className={TONE_TEXT[tone]} />
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isUnread && (
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-teal shrink-0"
            />
          )}
          <p
            className={`text-[15px] truncate ${
              isUnread ? "text-navy font-semibold" : "text-slate font-medium"
            }`}
          >
            {n.title}
          </p>
        </div>
        {n.body && (
          <p
            className={`text-[13px] text-slate mt-0.5 ${
              size === "compact" ? "line-clamp-2" : "line-clamp-3"
            }`}
          >
            {n.body}
          </p>
        )}
      </div>

      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-slate/70 shrink-0 mt-1">
        {timeAgo(n.created_at)}
      </span>
    </button>
  );
}
