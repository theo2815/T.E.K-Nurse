"use client";

import { useState } from "react";
import { Ban, CheckCircle2 } from "lucide-react";
import { SuspendStudentModal } from "./SuspendStudentModal";

type Props = {
  student: {
    id: string;
    full_name: string;
    email: string;
    is_active: boolean;
  };
};

/**
 * Header-mounted action: a single tight-bordered button that flips between
 * "Pause access" (red-deep) when the student is active, and "Restore access"
 * (teal) when they're suspended. Click opens the SuspendStudentModal.
 */
export function SuspendStudentButton({ student }: Props) {
  const [open, setOpen] = useState(false);
  const mode = student.is_active ? "suspend" : "reinstate";

  const buttonClass = student.is_active
    ? "border-red-deep text-red-deep hover:bg-red-deep hover:text-white"
    : "border-teal text-teal-deep hover:bg-teal hover:text-white";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded border-[1.5px] font-mono uppercase text-caps-md font-bold tracking-[0.08em] transition-colors ${buttonClass}`}
      >
        {student.is_active ? (
          <>
            <Ban size={14} strokeWidth={2.25} />
            Pause access
          </>
        ) : (
          <>
            <CheckCircle2 size={14} strokeWidth={2.25} />
            Restore access
          </>
        )}
      </button>

      <SuspendStudentModal
        open={open}
        onClose={() => setOpen(false)}
        mode={mode}
        student={{
          id: student.id,
          full_name: student.full_name,
          email: student.email,
        }}
      />
    </>
  );
}
