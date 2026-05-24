import { Card } from "@/components/ui/Card";
import { MonoId } from "@/components/ui/MonoId";
import { PhotoFrame } from "@/components/catalog/PhotoFrame";
import type { ActiveLoanRow } from "@/lib/supabase/queries/loans";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(fromIso: string, today: Date): number {
  const due = new Date(`${fromIso}T00:00:00`);
  const dueMid = startOfLocalDay(due);
  const todayMid = startOfLocalDay(today);
  return Math.round((dueMid.getTime() - todayMid.getTime()) / 86_400_000);
}

function formatShortDate(iso: string): string {
  // Accepts either YYYY-MM-DD or full ISO timestamp.
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function StaffLoanCard({ loan }: { loan: ActiveLoanRow }) {
  const today = new Date();
  const overdue = loan.status === "OVERDUE";
  const daysDelta = daysBetween(loan.expected_return_date, today);
  const remaining = daysDelta;
  const overdueDays = -daysDelta;

  const studentDetail = loan.student.student_id ?? loan.student.email;
  const qtyLabel = `${loan.quantity} ${loan.quantity === 1 ? "unit" : "units"}`;

  return (
    <Card variant={overdue ? "alert" : "default"}>
      <div className="flex flex-col gap-3">
        {/* Top row: LED + QR ID, status pill on the right */}
        <div className="flex items-center justify-between gap-3 text-caps-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span
              aria-hidden
              className={`relative inline-flex shrink-0 size-2 rounded-full ${
                overdue ? "bg-red-deep" : "bg-teal"
              }`}
            >
              <span
                className={`absolute inset-0 rounded-full opacity-60 animate-ping ${
                  overdue ? "bg-red-deep" : "bg-teal"
                }`}
              />
            </span>
            <MonoId id={loan.sku.qr_code} />
          </div>
          <span
            className={`font-mono uppercase text-caps-sm font-semibold tracking-[0.06em] ${
              overdue ? "text-red-deep" : "text-teal-deep"
            }`}
          >
            {overdue
              ? `OVERDUE · ${overdueDays}d`
              : remaining === 0
                ? "DUE TODAY"
                : remaining === 1
                  ? "DUE TOMORROW"
                  : `DUE IN ${remaining}d`}
          </span>
        </div>

        {/* Student lead */}
        <div>
          <p className="font-mono uppercase text-caps-xs text-slate/60 tracking-[0.08em]">
            Borrower
          </p>
          <h3 className="mt-0.5 font-display italic font-extrabold text-[22px] leading-tight text-navy line-clamp-1">
            {loan.student.full_name}
          </h3>
          {studentDetail && (
            <p className="text-[13px] text-slate/80">{studentDetail}</p>
          )}
        </div>

        {/* Item row */}
        <div className="flex items-center gap-3 pt-1 border-t border-rule/60">
          <PhotoFrame
            src={loan.sku.photo_url}
            alt={loan.sku.name}
            size="thumb"
            className="shrink-0"
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-navy text-[15px] leading-tight line-clamp-1">
              {loan.sku.name}
            </p>
            <p className="text-[13px] text-slate mt-0.5">
              Borrowed {formatShortDate(loan.borrowed_at)} · Due{" "}
              {formatShortDate(loan.expected_return_date)} · Qty {qtyLabel}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
