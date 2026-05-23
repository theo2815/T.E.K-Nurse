"use client";

import { useEffect, useState, useTransition } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { AlertTriangle, Ban, CheckCircle2, Mail } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  suspendStudent,
  reinstateStudent,
} from "@/app/staff/actions";

type Mode = "suspend" | "reinstate";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: Mode;
  student: {
    id: string;
    full_name: string;
    email: string;
  };
};

const MIN_REASON = 3;
const MAX_REASON = 500;

/**
 * Suspend/Reinstate modal. Shares the Decline-style chrome:
 * student summary line, warning callout, reason textarea with char counter,
 * "Email the student" toggle, danger/primary footer button.
 *
 * `mode` flips:
 *   - the eyebrow + title + warning copy
 *   - the textarea label (Reason vs Note)
 *   - reason required vs optional
 *   - confirm button tone (danger vs primary teal)
 */
export function SuspendStudentModal({ open, onClose, mode, student }: Props) {
  const router = useProgressRouter();
  const [text, setText] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setText("");
      setSendEmail(true);
      setError(null);
    }
  }, [open]);

  const trimmedLen = text.trim().length;
  const isSuspend = mode === "suspend";
  const reasonRequired = isSuspend;
  const tooShort = reasonRequired && trimmedLen < MIN_REASON;
  const tooLong = trimmedLen > MAX_REASON;
  const canSubmit = !tooShort && !tooLong && !pending;

  function handleConfirm() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = isSuspend
        ? await suspendStudent({
            student_id: student.id,
            reason: text.trim(),
            send_email: sendEmail,
          })
        : await reinstateStudent({
            student_id: student.id,
            note: text.trim(),
            send_email: sendEmail,
          });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  const counterTone = tooLong
    ? "text-red-deep font-semibold"
    : trimmedLen >= (reasonRequired ? MIN_REASON : 1)
      ? "text-slate"
      : "text-slate/60";

  const copy = isSuspend ? SUSPEND_COPY : REINSTATE_COPY;

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow={copy.eyebrow}
      title={copy.title(student.full_name)}
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
            variant={isSuspend ? "danger" : "primary"}
            onClick={handleConfirm}
            disabled={!canSubmit}
            loading={pending}
            className="!py-3.5"
          >
            {!pending &&
              (isSuspend ? (
                <Ban size={18} strokeWidth={2} />
              ) : (
                <CheckCircle2 size={18} strokeWidth={2} />
              ))}
            {isSuspend ? "Pause access" : "Restore access"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Student summary */}
        <div className="flex flex-col gap-1 text-[14px]">
          <p className="text-slate">
            Student:{" "}
            <span className="font-display italic font-extrabold text-[17px] text-navy">
              {student.full_name}
            </span>
          </p>
          <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] flex items-center gap-2">
            <Mail size={11} strokeWidth={2} className="text-teal" />
            {student.email}
          </p>
        </div>

        {/* Warning / info callout */}
        <div
          className={`border-l-4 rounded-r p-4 flex gap-3 ${
            isSuspend
              ? "border-red-deep bg-paper"
              : "border-teal bg-paper"
          }`}
        >
          <AlertTriangle
            size={18}
            strokeWidth={2}
            className={`shrink-0 mt-0.5 ${
              isSuspend ? "text-red-deep" : "text-teal-deep"
            }`}
          />
          <p className="text-[14px] text-slate leading-relaxed">{copy.warning}</p>
        </div>

        {/* Reason / note textarea */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="suspend-reason"
            className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]"
          >
            {copy.fieldLabel}
            {reasonRequired && (
              <span aria-hidden className="text-teal ml-1">
                *
              </span>
            )}
          </label>
          <textarea
            id="suspend-reason"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_REASON + 40}
            rows={4}
            placeholder={copy.placeholder}
            className="w-full rounded border-[1.5px] border-rule bg-white py-3 px-4 text-[15px] text-navy placeholder:text-slate/50 transition-colors focus:outline-none focus:border-teal resize-y"
          />
          <div className="flex items-center justify-between gap-3">
            <p className="text-[13px] text-slate">{copy.fieldHint}</p>
            <p
              className={`font-mono text-[12px] tracking-[0.04em] ${counterTone}`}
            >
              {trimmedLen}/{MAX_REASON}
            </p>
          </div>
        </div>

        {/* Email toggle — checkbox-style row, console aesthetic */}
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
              Email the student
            </p>
            <p className="text-[13px] text-slate leading-snug mt-0.5">
              {isSuspend
                ? "Sends a brief email with the reason above. Recommended — the student needs to know why they can't borrow."
                : "Sends a confirmation. Optional — the in-app notification fires either way."}
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

const SUSPEND_COPY = {
  eyebrow: "PAUSE ACCESS",
  title: (name: string) => `Pause access for ${name}?`,
  warning:
    "This student will be unable to submit new requests, pick up reserved items, or use consumables until reinstated. The reason below is logged to the audit trail and is included in the email below if enabled.",
  fieldLabel: "Reason",
  fieldHint: `At least ${MIN_REASON} characters. Visible to the student.`,
  placeholder:
    "e.g. Returned crash cart with missing pulse oximeter — awaiting replacement before lending resumes.",
};

const REINSTATE_COPY = {
  eyebrow: "RESTORE ACCESS",
  title: (name: string) => `Restore access for ${name}?`,
  warning:
    "This student will be able to borrow and request again immediately. The note below is logged to the audit trail and is included in the email below if enabled.",
  fieldLabel: "Note (optional)",
  fieldHint: "Optional. Visible to the student if email is enabled.",
  placeholder:
    "e.g. Replacement oximeter received — thanks for the patience.",
};
