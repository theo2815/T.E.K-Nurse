"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { LendModal } from "@/components/staff/LendModal";
import { LogUsageModal } from "@/components/staff/LogUsageModal";
import type { StudentSearchRow } from "@/lib/supabase/queries/staff-requests";

type EquipmentApprove = {
  type: "equipment";
  request_id: string;
  student: StudentSearchRow;
  quantity: number;
  expected_return_date: string;
  sku: {
    id: string;
    qr_code: string;
    name: string;
    available_units: number;
    reserved_units: number;
    borrowed_units: number;
  };
};

type ConsumableApprove = {
  type: "consumable";
  request_id: string;
  student: StudentSearchRow;
  quantity: number;
  sku: {
    id: string;
    qr_code: string;
    name: string;
    unit: string;
    total_remaining: number;
    per_request_max_quantity: number;
  };
};

type Props = EquipmentApprove | ConsumableApprove;

export function ApproveRequestAction(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 bg-teal text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-7 py-4 rounded whitespace-nowrap transition-colors hover:bg-teal-deep active:bg-navy-deep w-full md:w-auto"
      >
        Approve pickup
        <ArrowRight size={18} strokeWidth={2} />
      </button>

      {props.type === "equipment" ? (
        <LendModal
          mode="approve"
          open={open}
          onClose={() => setOpen(false)}
          sku={props.sku}
          request_id={props.request_id}
          prefill={{
            student: props.student,
            quantity: props.quantity,
            expected_return_date: props.expected_return_date,
          }}
        />
      ) : (
        <LogUsageModal
          mode="approve"
          open={open}
          onClose={() => setOpen(false)}
          sku={props.sku}
          request_id={props.request_id}
          prefill={{
            student: props.student,
            quantity: props.quantity,
          }}
        />
      )}
    </>
  );
}
