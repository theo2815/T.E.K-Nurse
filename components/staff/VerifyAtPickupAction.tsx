"use client";

import { useState } from "react";
import { BadgeCheck } from "lucide-react";
import {
  VerifyAtPickupModal,
  type ReleaseSuccessActivity,
} from "@/components/staff/VerifyAtPickupModal";
import type { StaffPendingRequestRow } from "@/lib/supabase/queries/staff-requests";

type Props = {
  request: StaffPendingRequestRow;
  onSuccess?: (activity: ReleaseSuccessActivity) => void;
};

export function VerifyAtPickupAction({ request, onSuccess }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-7 py-4 rounded whitespace-nowrap transition-colors hover:bg-teal-deep active:bg-navy-deep w-full md:w-auto"
      >
        <BadgeCheck size={16} strokeWidth={2} />
        Verify &amp; release
      </button>

      <VerifyAtPickupModal
        open={open}
        onClose={() => setOpen(false)}
        request={request}
        onSuccess={onSuccess}
      />
    </>
  );
}
