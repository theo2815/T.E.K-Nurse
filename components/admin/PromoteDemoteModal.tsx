"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useProgressRouter } from "@/lib/use-progress-router";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Mail,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  promoteToStaff,
  demoteToStudent,
} from "@/app/staff/admin/users/actions";

type Mode = "promote" | "demote";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  user: {
    id: string;
    full_name: string;
    email: string;
    /** Current TEK-NNN on demote; null on promote (not yet assigned). */
    staff_id: string | null;
  };
};

const MAX_NOTE = 500;

/**
 * Promote/Demote confirm modal. Mirrors the SuspendStudentModal shape: user
 * summary line, warning callout (teal for promote, red-deep for demote),
 * optional note textarea, "Email the user" toggle, primary/danger CTA.
 *
 * The note is OPTIONAL on both modes — promote and demote are reversible
 * role flips, not punitive actions. The audit log captures who/when/why
 * either way. The textarea exists so admins can leave context for the user
 * receiving the email.
 */
export function PromoteDemoteModal({ open, onClose, mode, user }: Props) {
  const router = useProgressRouter();
  const [note, setNote] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setNote("");
      setSendEmail(true);
      setError(null);
    }
  }, [open]);

  const trimmedLen = note.trim().length;
  const tooLong = trimmedLen > MAX_NOTE;
  const canSubmit = !tooLong && !pending;

  const isPromote = mode === "promote";
  const copy = isPromote ? PROMOTE_COPY : DEMOTE_COPY;

  function handleConfirm() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = isPromote
        ? await promoteToStaff({
            user_id: user.id,
            note: note.trim(),
            send_email: sendEmail,
          })
        : await demoteToStudent({
            user_id: user.id,
            note: note.trim(),
            send_email: sendEmail,
          });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (isPromote) {
        toast.success(`Promoted ${user.full_name} to staff`, {
          description: sendEmail
            ? "A new TEK-NNN was assigned. Welcome email queued."
            : "A new TEK-NNN was assigned. No email sent.",
        });
      } else {
        toast.success(`Demoted ${user.full_name} to student`, {
          description: sendEmail
            ? `Staff ID ${user.staff_id ?? ""} released. Notification email queued.`.trim()
            : `Staff ID ${user.staff_id ?? ""} released. No email sent.`.trim(),
        });
      }
      onClose();
      router.refresh();
    });
  }

  const counterTone = tooLong
    ? "text-red-deep font-semibold"
    : trimmedLen > 0
      ? "text-slate"
      : "text-slate/60";

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={copy.eyebrow}
      title={copy.title(user.full_name)}
      status={pending ? "WORKING" : "READY"}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-navy text-[15px] font-bold hover:underline underline-offset-4 decoration-teal decoration-2 sm:px-3"
          >
            Cancel
          </button>
          <Button
            type="button"
            variant={isPromote ? "primary" : "danger"}
            onClick={handleConfirm}
            disabled={!canSubmit}
            loading={pending}
            className="!py-3.5"
          >
            {!pending &&
              (isPromote ? (
                <ArrowUpRight size={18} strokeWidth={2} />
              ) : (
                <ArrowDownLeft size={18} strokeWidth={2} />
              ))}
            {isPromote ? "Promote to staff" : "Demote to student"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* User summary */}
        <div className="flex flex-col gap-1 text-[14px]">
          <p className="text-slate">
            User:{" "}
            <span className="font-display italic font-extrabold text-[17px] text-navy">
              {user.full_name}
            </span>
          </p>
          <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] flex items-center gap-2">
            <Mail size={11} strokeWidth={2} className="text-teal" />
            {user.email}
          </p>
          {!isPromote && user.staff_id && (
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mt-0.5">
              Current staff ID:{" "}
              <span className="text-navy font-semibold">{user.staff_id}</span>
              <span className="text-slate/70 normal-case ml-2">
                — will be released
              </span>
            </p>
          )}
        </div>

        {/* Warning / info callout */}
        <div
          className={`border-l-4 rounded-r p-4 flex gap-3 ${
            isPromote
              ? "border-teal bg-paper"
              : "border-red-deep bg-paper"
          }`}
        >
          <AlertTriangle
            size={18}
            strokeWidth={2}
            className={`shrink-0 mt-0.5 ${
              isPromote ? "text-teal-deep" : "text-red-deep"
            }`}
          />
          <p className="text-[14px] text-slate leading-relaxed">
            {copy.warning}
          </p>
        </div>

        {/* Optional note */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="role-change-note"
            className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
          >
            Note (optional)
          </label>
          <textarea
            id="role-change-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={MAX_NOTE + 40}
            rows={3}
            placeholder={copy.placeholder}
            className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-4 text-[15px] text-navy placeholder:text-slate/50 transition-colors focus:outline-none focus:border-teal resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-slate">
              Logged to the audit trail. Visible to the user if email is
              enabled.
            </p>
            <p
              className={`font-mono text-[12px] tracking-[0.04em] ${counterTone}`}
            >
              {trimmedLen}/{MAX_NOTE}
            </p>
          </div>
        </div>

        {/* Email toggle */}
        <label className="flex items-start gap-3 p-3 rounded border border-rule bg-paper hover:border-teal/50 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={sendEmail}
            onChange={(e) => setSendEmail(e.target.checked)}
            className="mt-0.5 size-4 accent-teal cursor-pointer"
          />
          <div className="flex-1 min-w-0">
            <p className="text-[14px] text-navy font-semibold flex items-center gap-2">
              <Mail size={14} strokeWidth={1.75} className="text-teal" />
              Email the user
            </p>
            <p className="text-[13px] text-slate leading-snug mt-0.5">
              {copy.emailHint}
            </p>
          </div>
        </label>

        {error && (
          <div className="border-l-[3px] border-red-deep pl-3 py-1">
            <p className="text-[14px] text-red-deep font-medium">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

const PROMOTE_COPY = {
  eyebrow: "PROMOTE TO STAFF",
  title: (name: string) => `Promote ${name} to staff?`,
  warning:
    "This user will gain staff capabilities immediately: approving requests, scanning equipment, managing inventory, and viewing reports. A new TEK-NNN staff ID is assigned automatically.",
  placeholder: "e.g. Welcome to the team — you're covering Tuesday afternoons.",
  emailHint:
    "Sends a welcome email with their new staff ID and console link. Recommended — the in-app notification fires either way.",
};

const DEMOTE_COPY = {
  eyebrow: "DEMOTE TO STUDENT",
  title: (name: string) => `Demote ${name} back to student?`,
  warning:
    "This user loses all staff capabilities immediately. Their TEK-NNN staff ID is released (not reused). They retain their student account and can borrow as usual. Historical staff actions remain attributed to them in the audit log.",
  placeholder:
    "e.g. End of semester rotation — thanks for the help this term.",
  emailHint:
    "Sends a brief email explaining the change. Recommended — the in-app notification fires either way.",
};
