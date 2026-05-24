"use client";

import { AlertTriangle, Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";

const MAX_NAME_LEN = 120;

export type ProfileFieldsRole = "staff" | "admin" | "student";

type Props = {
  mode: "view" | "edit";
  role: ProfileFieldsRole;
  fullName: string;
  email: string;
  /** Set for students; null for staff/admin. */
  studentId?: string | null;
  /** Set for staff/admin; null for students. */
  staffId?: string | null;
  onChangeFullName: (value: string) => void;
  error?: string | null;
};

/**
 * Presentational fields for the Profile section of /staff/settings +
 * /student/settings. No internal state, no buttons — the parent shell
 * owns isEditing, full_name buffer, and submit. This component just
 * renders the right field shape for the current mode.
 *
 * Full name is the only editable field. Email and the institutional ID
 * (student_id or staff_id) stay locked in both modes — those are owned by
 * signup (student_id) or admin promote (staff_id).
 */
export function ProfileFields({
  mode,
  role,
  fullName,
  email,
  studentId,
  staffId,
  onChangeFullName,
  error,
}: Props) {
  const institutionalId =
    role === "student"
      ? { label: "Student ID", value: studentId ?? "" }
      : staffId
        ? { label: "Staff ID", value: staffId }
        : null;

  return (
    <div className="flex flex-col gap-5">
      {mode === "edit" ? (
        <Input
          label="Full name"
          name="full_name"
          autoComplete="name"
          value={fullName}
          onChange={(e) => onChangeFullName(e.target.value)}
          required
          requiredMark
          maxLength={MAX_NAME_LEN}
        />
      ) : (
        <DisplayField label="Full name" value={fullName} />
      )}

      <LockedField label="Email" value={email} />

      {institutionalId && (
        <LockedField
          label={institutionalId.label}
          value={institutionalId.value}
          mono
        />
      )}

      {error && mode === "edit" && (
        <div
          role="alert"
          className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded inline-flex items-start gap-2.5 text-red-deep"
        >
          <AlertTriangle
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <p className="text-[14px] font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}

function DisplayField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
        {label}
      </span>
      <p className="text-[16px] text-navy font-medium leading-snug">
        {value || "—"}
      </p>
    </div>
  );
}

function LockedField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
        {label}
      </span>
      <div className="inline-flex items-center gap-3 rounded border-[1.5px] border-rule bg-mist py-3 px-4 text-navy">
        <Lock size={14} strokeWidth={2} className="text-slate" />
        <span
          className={
            mono
              ? "font-mono text-[15px] tracking-[0.05em] uppercase font-semibold"
              : "font-mono text-[15px] tracking-[0.03em]"
          }
        >
          {value || "—"}
        </span>
        <span className="ml-auto font-mono text-caps-sm text-slate tracking-[0.08em]">
          Locked
        </span>
      </div>
    </div>
  );
}
