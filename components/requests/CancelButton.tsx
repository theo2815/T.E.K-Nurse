"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import { cancelRequest } from "@/app/student/requests/actions";

export function CancelButton({
  id,
  type,
}: {
  id: string;
  type: "equipment" | "consumable";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await cancelRequest({ id, type });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/student/requests");
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 bg-transparent text-red-deep border-[1.5px] border-red-deep font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded transition-colors hover:bg-red-deep hover:text-white w-full md:w-auto"
      >
        <X size={18} strokeWidth={2} />
        Cancel request
      </button>
    );
  }

  return (
    <div className="border-l-4 border-red bg-paper rounded p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={20}
          strokeWidth={2}
          className="text-red-deep shrink-0 mt-0.5"
        />
        <div>
          <p className="font-display italic font-extrabold text-[18px] text-navy">
            Cancel this request?
          </p>
          <p className="mt-1 text-[15px] text-slate">
            The hold on this item will be released so others can borrow it.
            You can submit a new request anytime.
          </p>
        </div>
      </div>

      {error && (
        <p className="text-[14px] text-red-deep font-medium">{error}</p>
      )}

      <div className="flex flex-col md:flex-row md:justify-end gap-3">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={pending}
          className="text-navy text-[15px] font-bold px-4 py-3 hover:underline underline-offset-4 decoration-teal decoration-2 disabled:opacity-40"
        >
          Keep request
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 bg-red-deep text-white font-mono uppercase text-[15px] tracking-[0.12em] font-bold px-6 py-4 rounded transition-colors hover:opacity-90 disabled:opacity-40 disabled:pointer-events-none"
        >
          {pending ? "Cancelling…" : "Yes, cancel"}
        </button>
      </div>
    </div>
  );
}
