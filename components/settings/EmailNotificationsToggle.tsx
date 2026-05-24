"use client";

import { useState, useTransition } from "react";
import { Mail } from "lucide-react";
import { toast } from "sonner";

type ToggleAction = (enabled: boolean) => Promise<{ error?: string }>;

/**
 * Live email-notifications switch. Optimistic — flips visually the instant
 * the user taps, then fires the server action in a transition. On error the
 * switch rolls back to the previous position and a toast surfaces the
 * reason. There's no "Saved" toast on success — the visible flip is its
 * own acknowledgement.
 *
 * This toggle is INTENTIONALLY outside the Edit/Save FAB pattern that
 * governs the other settings fields. Toggles are live controls; users
 * expect them to persist immediately, not to be gated by an edit mode.
 */
export function EmailNotificationsToggle({
  initialEnabled,
  action,
}: {
  initialEnabled: boolean;
  action: ToggleAction;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [pending, startTransition] = useTransition();

  function onToggle() {
    const next = !enabled;
    setEnabled(next);
    startTransition(async () => {
      const result = await action(next);
      if (result.error) {
        setEnabled(!next);
        toast.error(`Couldn't update: ${result.error}`);
      }
    });
  }

  return (
    <div className="border-[1.5px] border-rule rounded bg-paper">
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5">
        <div className="flex items-start gap-3 min-w-0">
          <Mail
            size={16}
            strokeWidth={2}
            className="text-slate mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[15px] text-navy font-medium">
              Email notifications
            </p>
            <p className="text-[12px] text-slate mt-0.5 leading-snug">
              Routine emails like loan reminders and request updates.
              Critical alerts (suspension, account changes) always send.
            </p>
          </div>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Email notifications"
          onClick={onToggle}
          disabled={pending}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
            enabled ? "bg-teal" : "bg-slate/30"
          }`}
        >
          <span
            aria-hidden
            className={`inline-block size-5 transform rounded-full bg-white shadow-sm transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
