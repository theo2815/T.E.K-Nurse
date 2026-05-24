"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Mail, UserPlus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { inviteStaff } from "@/app/staff/admin/users/actions";

const EMAIL_PATTERN = /^[^\s@]+@cit\.edu$/i;
const MAX_NAME = 80;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function InviteStaffModal({ open, onClose }: Props) {
  const router = useProgressRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) {
      setEmail("");
      setFullName("");
      setError(null);
    }
  }, [open]);

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = fullName.trim();
  const emailValid = EMAIL_PATTERN.test(trimmedEmail);
  const nameValid = trimmedName.length > 0 && trimmedName.length <= MAX_NAME;
  const emailHint =
    email.length > 0 && !emailValid
      ? "Must be a @cit.edu address."
      : undefined;
  const nameHint =
    fullName.length > MAX_NAME
      ? `Name is too long (${trimmedName.length}/${MAX_NAME} chars).`
      : undefined;

  const canSubmit = !pending && emailValid && nameValid;

  function handleConfirm() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const result = await inviteStaff({
        email: trimmedEmail,
        full_name: trimmedName,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(`Invited ${trimmedName}`, {
        description: `An invite email is on its way to ${trimmedEmail}.`,
      });
      onClose();
      router.refresh();
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      eyebrow="INVITE STAFF"
      title="Invite a new staff member"
      status={pending ? "SENDING" : "READY"}
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
            variant="primary"
            onClick={handleConfirm}
            disabled={!canSubmit}
            loading={pending}
            className="!py-3.5"
          >
            {!pending && <UserPlus size={18} strokeWidth={2} />}
            Send invite
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-[14px] text-slate leading-relaxed">
          The invitee receives an email with a one-time link to set their
          password. They'll appear in the table as <strong>Pending</strong>{" "}
          until they accept. Their TEK-NNN is assigned now.
        </p>

        <Input
          label="Full name"
          type="text"
          autoComplete="name"
          placeholder="Nina Reyes"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          onKeyDown={handleKeyDown}
          error={nameHint}
          required
          requiredMark
        />

        <Input
          label="CIT email"
          type="email"
          autoComplete="email"
          placeholder="nina.reyes@cit.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={handleKeyDown}
          error={emailHint}
          required
          requiredMark
        />

        <div className="border-l-4 border-teal bg-paper rounded-r p-4 flex gap-3">
          <Mail
            size={18}
            strokeWidth={2}
            className="text-teal-deep shrink-0 mt-0.5"
          />
          <p className="text-[14px] text-slate leading-relaxed">
            We'll send the invite from the T.E.K Nurse address. If the link
            isn't received, you can resend from the table later.
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
