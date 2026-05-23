"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { markAllNotificationsRead } from "@/app/notifications/actions";

type Props = {
  unreadCount: number;
  variant?: "popover" | "page";
  /** Optional callback after success — e.g. close the popover. */
  onAfterMark?: () => void;
};

export function MarkAllReadButton({
  unreadCount,
  variant = "page",
  onAfterMark,
}: Props) {
  const [pending, startTransition] = useTransition();
  const disabled = pending || unreadCount === 0;

  function handleClick() {
    startTransition(async () => {
      const res = await markAllNotificationsRead();
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.markedCount > 0) {
        toast.success(
          `Marked ${res.markedCount} notification${
            res.markedCount === 1 ? "" : "s"
          } as read`,
        );
      }
      onAfterMark?.();
    });
  }

  if (variant === "popover") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className="font-mono uppercase text-[11px] tracking-[0.08em] font-semibold text-cyan hover:text-white transition-colors disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-1.5"
      >
        {pending && <Loader2 size={12} strokeWidth={2} className="animate-spin" />}
        Mark all read
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className="text-navy text-[14px] font-bold px-3 py-2 hover:underline underline-offset-4 decoration-teal decoration-2 disabled:opacity-40 disabled:pointer-events-none inline-flex items-center gap-2"
    >
      {pending && <Loader2 size={14} strokeWidth={2} className="animate-spin" />}
      Mark all read
    </button>
  );
}
