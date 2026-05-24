"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useProgressRouter } from "@/lib/use-progress-router";
import { AlertTriangle, Mail, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cancelStaffInvite } from "@/app/staff/admin/users/actions";

type Props = {
  open: boolean;
  onClose: () => void;
  user: {
    id: string;
    full_name: string;
    email: string;
    /** TEK-NNN that was assigned at invite time. Displayed in the
     *  summary so the admin knows which ID is about to be released. */
    staff_id: string | null;
  };
};

/**
 * Confirm-cancel modal for pending staff invites. Mirrors the
 * PromoteDemoteModal shape: user summary, warning callout, danger CTA.
 *
 * Cancelling deletes the auth.users row (CASCADE clears public.users) and
 * releases the staff_id to the gap pool — same monotonic policy as
 * demotion. Invite link becomes invalid immediately.
 */
export function CancelInviteModal({ open, onClose, user }: Props) {
  const router = useProgressRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) setError(null);
  }, [open]);

  function handleConfirm() {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelStaffInvite({ user_id: user.id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Cancelled ${user.full_name}'s invite`, {
        description: user.staff_id
          ? `Staff ID ${user.staff_id} released. Their invite link is no longer valid.`
          : "Their invite link is no longer valid.",
      });
      onClose();
      router.refresh();
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="CANCEL INVITE"
      title={`Cancel ${user.full_name}'s invite?`}
      status={pending ? "WORKING" : "READY"}
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-navy text-[15px] font-bold hover:underline underline-offset-4 decoration-teal decoration-2 sm:px-3"
          >
            Keep invite
          </button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={pending}
            loading={pending}
            className="!py-3.5"
          >
            {!pending && <X size={18} strokeWidth={2} />}
            Cancel invite
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
          {user.staff_id && (
            <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.08em] mt-0.5">
              Reserved staff ID:{" "}
              <span className="text-navy font-semibold">{user.staff_id}</span>
              <span className="text-slate/70 normal-case ml-2">
                — will be released
              </span>
            </p>
          )}
        </div>

        {/* Warning callout */}
        <div className="border-l-4 border-red-deep bg-paper rounded-r p-4 flex gap-3">
          <AlertTriangle
            size={18}
            strokeWidth={2}
            className="shrink-0 mt-0.5 text-red-deep"
          />
          <p className="text-[14px] text-slate leading-relaxed">
            The invite link becomes invalid immediately. The reserved TEK-NNN
            won't be reused — a fresh invite gets the next number. If you
            want to invite this person again later, you'll need to send a
            new invite.
          </p>
        </div>

        {error && (
          <div className="border-l-[3px] border-red-deep pl-3 py-1">
            <p className="text-[14px] text-red-deep font-medium">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
