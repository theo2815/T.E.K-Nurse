"use client";

import { useProgressRouter } from "@/lib/use-progress-router";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Mail,
  Package,
  Beaker,
} from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import {
  releaseBorrowRequest,
  releaseConsumableRequest,
} from "@/app/staff/actions";
import type { StaffPendingRequestRow } from "@/lib/supabase/queries/staff-requests";

export type ReleaseSuccessActivity = {
  kind: "release";
  variant: "equipment" | "consumable";
  sku: { qr_code: string; name: string; photo_url: string | null };
  student: { full_name: string };
  quantity: number;
  pickup_code: string;
  at: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** When provided, renders the modal's chevron-left affordance — used when
   *  this modal was opened from the multi-student PickupVerifyPicker. */
  onBack?: () => void;
  request: StaffPendingRequestRow;
  onSuccess?: (activity: ReleaseSuccessActivity) => void;
};

export function VerifyAtPickupModal({
  open,
  onClose,
  onBack,
  request,
  onSuccess,
}: Props) {
  const router = useProgressRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const variant: "equipment" | "consumable" = request.type;
  const code = request.pickup_code ?? "";

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const res =
        variant === "equipment"
          ? await releaseBorrowRequest({ request_id: request.id })
          : await releaseConsumableRequest({ request_id: request.id });

      if (!res.ok) {
        setError(res.error);
        return;
      }

      toast.success(
        variant === "equipment" ? "Item released" : "Units issued",
        {
          description: `${request.student.full_name} · ${request.sku.qr_code}`,
        },
      );

      onSuccess?.({
        kind: "release",
        variant,
        sku: {
          qr_code: request.sku.qr_code,
          name: request.sku.name,
          photo_url: request.sku.photo_url,
        },
        student: { full_name: request.student.full_name },
        quantity: request.quantity,
        pickup_code: code,
        at: Date.now(),
      });

      router.refresh();
      onClose();
    });
  }

  const TypeIcon = variant === "equipment" ? Package : Beaker;
  const unitLabel =
    request.sku.unit ?? (request.quantity === 1 ? "unit" : "units");

  return (
    <Modal
      open={open}
      onClose={onClose}
      onBack={onBack}
      eyebrow="PICKUP · VERIFY"
      title={request.student.full_name}
      size="wide"
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-navy text-[15px] font-bold hover:underline underline-offset-4 decoration-teal decoration-2 px-3 py-2"
          >
            Cancel
          </button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!code}
            loading={pending}
            className="!px-7 whitespace-nowrap"
          >
            {variant === "equipment" ? "Release item" : "Issue units"}
            <ArrowRight size={18} strokeWidth={2} />
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Student card */}
        <div className="border-[1.5px] border-rule rounded p-4 flex items-start gap-4">
          <Avatar name={request.student.full_name} />
          <div className="flex-1 min-w-0">
            <p className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.1em]">
              Student
            </p>
            <p className="font-display italic font-extrabold text-[22px] text-navy leading-tight">
              {request.student.full_name}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-slate">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={13} strokeWidth={1.75} className="text-slate/60" />
                <span className="font-mono truncate">
                  {request.student.email}
                </span>
              </span>
              {request.student.year_section && (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap
                    size={13}
                    strokeWidth={1.75}
                    className="text-slate/60"
                  />
                  <span className="font-mono uppercase tracking-[0.06em]">
                    {request.student.year_section}
                  </span>
                </span>
              )}
            </div>
            {request.approved_by_name && request.approved_at && (
              <p className="mt-3 inline-flex items-center gap-1.5 font-mono uppercase text-[11px] tracking-[0.12em] font-bold text-green">
                <CheckCircle2 size={12} strokeWidth={2.5} />
                Approved by {request.approved_by_name} ·{" "}
                {timeAgo(request.approved_at)}
              </p>
            )}
          </div>
        </div>

        {/* Item row */}
        <div className="border-l-[3px] border-teal pl-4 flex items-center gap-4">
          <PhotoFrame
            src={request.sku.photo_url}
            alt={request.sku.name}
            size="thumb"
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-mono uppercase text-caps-sm font-semibold tracking-[0.08em] text-navy">
              {request.sku.qr_code}
            </p>
            <p className="text-[15px] text-navy font-semibold truncate">
              {request.sku.name}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="inline-flex items-baseline gap-1.5 text-navy">
              <TypeIcon size={16} strokeWidth={1.75} className="text-teal" />
              <span className="font-display italic font-extrabold text-[22px] leading-none">
                {request.quantity}
              </span>
              <span className="text-[13px] text-slate">{unitLabel}</span>
            </p>
          </div>
        </div>

        {/* Pickup code hero — matches PickupCodeCard typography */}
        <section
          aria-label="Pickup code"
          className="relative overflow-hidden border-[1.5px] border-amber rounded bg-paper"
        >
          <header className="bg-amber/15 px-5 py-3 flex items-center justify-between border-b border-amber/40">
            <p className="font-mono uppercase text-[11px] tracking-[0.16em] font-bold text-amber-700">
              Pickup code
            </p>
            {request.pickup_expires_at && (
              <ExpiryChip expiresAt={request.pickup_expires_at} />
            )}
          </header>
          <div className="px-5 md:px-7 py-7 md:py-8 flex flex-col items-center gap-3 text-center">
            <p
              aria-label={`Pickup code ${code.split("").join(" ")}`}
              className="font-mono font-bold text-[44px] md:text-[56px] tracking-[0.14em] text-navy leading-none tabular-nums"
            >
              {formatCode(code)}
            </p>
            <p className="text-[14px] text-slate max-w-sm leading-relaxed">
              Compare with the student&apos;s screen. If they match, release the
              item.
            </p>
          </div>
        </section>

        {error && (
          <p className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 text-[14px] text-red-deep">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

function formatCode(code: string): string {
  const clean = code.replace(/[^0-9A-Z]/gi, "").toUpperCase();
  if (clean.length === 6) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return clean;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function Avatar({ name }: { name: string }) {
  return (
    <div
      aria-hidden
      className="shrink-0 size-14 rounded-full border-[1.5px] border-rule bg-mist flex items-center justify-center font-display italic font-extrabold text-[20px] text-navy"
    >
      {initials(name)}
    </div>
  );
}

function ExpiryChip({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const remainingMs = new Date(expiresAt).getTime() - now;

  if (remainingMs <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono uppercase text-[10.5px] tracking-[0.12em] font-bold text-red-deep">
        <Clock size={11} strokeWidth={2.5} />
        Expired
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono uppercase text-[10.5px] tracking-[0.12em] font-bold text-amber-700">
      <Clock size={11} strokeWidth={2.5} />
      Expires in {formatRemaining(remainingMs)}
    </span>
  );
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
