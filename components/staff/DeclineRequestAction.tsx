"use client";

import { useState } from "react";
import { X as XIcon } from "lucide-react";
import { DeclineRequestModal } from "@/components/staff/DeclineRequestModal";

type Props = {
  type: "equipment" | "consumable";
  request_id: string;
  sku: { qr_code: string; name: string };
  student_name: string;
};

export function DeclineRequestAction({
  type,
  request_id,
  sku,
  student_name,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 border-[1.5px] border-rule bg-paper text-red-deep font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-7 py-4 rounded whitespace-nowrap transition-colors hover:border-red-deep hover:bg-red-deep/5 w-full md:w-auto"
      >
        <XIcon size={18} strokeWidth={2} />
        Decline
      </button>

      <DeclineRequestModal
        open={open}
        onClose={() => setOpen(false)}
        type={type}
        request_id={request_id}
        sku={sku}
        student_name={student_name}
      />
    </>
  );
}
