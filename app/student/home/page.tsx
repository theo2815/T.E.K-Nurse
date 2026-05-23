import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Activity as ActivityIcon,
  Beaker,
  BookOpen,
  Clock,
  History,
  Inbox,
  Layers,
  Package,
  Ticket,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { listMyActiveBorrows } from "@/lib/supabase/queries/transactions";
import { listMyRequests } from "@/lib/supabase/queries/requests";
import { listMyTransactionHistory } from "@/lib/supabase/queries/student-history";
import { getMyPausedState } from "@/lib/supabase/queries/students";

import { SpeedLines } from "@/components/SpeedLines";
import { StudentHomeRealtime } from "@/components/student/StudentHomeRealtime";
import { StudentPausedStrip } from "@/components/student/StudentPausedStrip";
import {
  PickupReadyStrip,
  type PickupReadyItem,
} from "@/components/student/PickupReadyStrip";
import { DueBackList } from "@/components/student/DueBackList";
import { PendingApprovalList } from "@/components/student/PendingApprovalList";
import { RecentActivityList } from "@/components/student/RecentActivityList";

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

function dayName(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "Asia/Manila",
  });
}

export default async function StudentHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, pausedState, activeBorrows, pending, approved, historyPage] =
    await Promise.all([
      supabase
        .from("users")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle(),
      getMyPausedState(),
      listMyActiveBorrows(),
      listMyRequests({ scope: "pending" }),
      listMyRequests({ scope: "approved" }),
      listMyTransactionHistory({ userId: user.id, pageSize: 5 }),
    ]);

  const nowMs = Date.now();
  const pickupReady: PickupReadyItem[] = approved
    .filter(
      (r) =>
        r.pickup_code &&
        r.pickup_expires_at &&
        new Date(r.pickup_expires_at).getTime() > nowMs,
    )
    .map((r) => ({
      id: r.id,
      type: r.type,
      sku_qr: r.sku.qr_code,
      sku_name: r.sku.name,
      quantity: r.quantity,
      unit: r.sku.unit,
      pickup_code: r.pickup_code as string,
      pickup_expires_at: r.pickup_expires_at as string,
    }));

  const overdueCount = activeBorrows.filter((b) => b.status === "OVERDUE").length;
  const borrowedCount = activeBorrows.length - overdueCount;

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      <StudentHomeRealtime studentId={user.id} />

      <header>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Chart · {dayName()}
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[56px] text-navy leading-[1.05]">
          Welcome back,{" "}
          <span className="text-teal">
            {profile?.full_name ? firstName(profile.full_name) : "student"}
          </span>
        </h1>
        <p className="mt-3 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
          {summarize({
            pickup: pickupReady.length,
            overdue: overdueCount,
            borrowed: borrowedCount,
            pending: pending.length,
          })}
        </p>
      </header>

      {pausedState.paused && (
        <StudentPausedStrip
          reason={pausedState.reason}
          suspendedAt={pausedState.suspendedAt}
        />
      )}

      {pickupReady.length > 0 && <PickupReadyStrip items={pickupReady} />}

      <div className="grid gap-10 md:grid-cols-[minmax(0,_1fr)_280px] md:items-start">
        {/* Main column */}
        <div className="flex flex-col gap-10 min-w-0">
          {/* Due back */}
          <section className="flex flex-col gap-4">
            <SectionHeader
              icon={<Package size={14} strokeWidth={2} />}
              label="Due back"
              meta={
                activeBorrows.length === 0
                  ? "NOTHING ON LOAN"
                  : overdueCount > 0
                    ? `${activeBorrows.length} ACTIVE · ${overdueCount} OVERDUE`
                    : `${activeBorrows.length} ACTIVE · ON SCHEDULE`
              }
              metaAlert={overdueCount > 0}
            />
            <DueBackList rows={activeBorrows} />
          </section>

          {/* Pending approval */}
          {pending.length > 0 && (
            <section className="flex flex-col gap-4">
              <SectionHeader
                icon={<Inbox size={14} strokeWidth={2} />}
                label="Waiting on staff"
                meta={`${pending.length} PENDING`}
              />
              <PendingApprovalList rows={pending} />
            </section>
          )}

          {/* Recent activity */}
          <section className="flex flex-col gap-4 min-w-0">
            <SectionHeader
              icon={<ActivityIcon size={14} strokeWidth={2} />}
              label="Recent activity"
              meta={
                historyPage.total === 0
                  ? "NO HISTORY YET"
                  : `LAST ${historyPage.rows.length} OF ${historyPage.total}`
              }
              right={
                historyPage.total > historyPage.rows.length ? (
                  <Link
                    href="/student/history"
                    className="font-mono uppercase text-caps-sm text-teal hover:text-teal-deep tracking-[0.08em] font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    See all
                    <ArrowRight size={12} strokeWidth={2} />
                  </Link>
                ) : null
              }
            />
            <RecentActivityList items={historyPage.rows} />
          </section>

          <HowBorrowingWorks />
        </div>

        {/* Right rail — quick actions */}
        <aside className="flex flex-col gap-3 md:sticky md:top-24">
          <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em] mb-1">
            Quick actions
          </p>

          <ActionLink
            href="/student/equipment"
            label="Request equipment"
            icon={<Package size={18} strokeWidth={1.75} />}
            primary
            disabled={pausedState.paused}
            disabledNote={pausedState.paused ? "Account paused" : undefined}
          />
          <ActionLink
            href="/student/consumables"
            label="Browse consumables"
            icon={<Beaker size={18} strokeWidth={1.75} />}
          />
          <ActionLink
            href="/student/requests"
            label="My requests"
            icon={<Ticket size={18} strokeWidth={1.75} />}
            count={pending.length + pickupReady.length}
          />
          <ActionLink
            href="/student/history"
            label="See full history"
            icon={<History size={18} strokeWidth={1.75} />}
          />
          <ActionLink
            href="#how-borrowing-works"
            label="How borrowing works"
            icon={<BookOpen size={18} strokeWidth={1.75} />}
            variant="ghost"
          />
        </aside>
      </div>
    </div>
  );
}

function summarize({
  pickup,
  overdue,
  borrowed,
  pending,
}: {
  pickup: number;
  overdue: number;
  borrowed: number;
  pending: number;
}): string {
  if (pickup === 0 && overdue === 0 && borrowed === 0 && pending === 0) {
    return "ALL CLEAR · NOTHING WAITING";
  }
  const parts: string[] = [];
  if (pickup > 0)
    parts.push(`${pickup} READY TO COLLECT`);
  if (overdue > 0) parts.push(`${overdue} OVERDUE`);
  if (borrowed > 0) parts.push(`${borrowed} BORROWED`);
  if (pending > 0) parts.push(`${pending} WAITING ON STAFF`);
  return parts.join(" · ");
}

function SectionHeader({
  icon,
  label,
  meta,
  metaAlert,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  meta: string;
  metaAlert?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <span className="text-teal" aria-hidden>
          {icon}
        </span>
        <h2 className="font-mono uppercase text-caps-md text-slate font-semibold tracking-[0.1em]">
          {label}
        </h2>
      </div>
      <div className="flex items-center gap-3">
        {right}
        <p
          className={[
            "font-mono uppercase text-caps-sm tracking-[0.08em]",
            metaAlert ? "text-red-deep font-bold" : "text-slate/70",
          ].join(" ")}
        >
          {meta}
        </p>
      </div>
    </div>
  );
}

function ActionLink({
  href,
  label,
  count,
  icon,
  primary,
  disabled,
  disabledNote,
  variant = "default",
}: {
  href: string;
  label: string;
  count?: number;
  icon: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
  disabledNote?: string;
  variant?: "default" | "ghost";
}) {
  if (disabled) {
    return (
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded border-[1.5px] border-rule bg-paper opacity-60">
        <span className="inline-flex items-center gap-2.5 text-slate font-mono uppercase text-[14px] tracking-[0.1em] font-bold">
          <span className="text-slate/60" aria-hidden>
            {icon}
          </span>
          {label}
        </span>
        {disabledNote && (
          <span className="font-mono uppercase text-caps-sm text-red-deep/80 tracking-[0.08em] inline-flex items-center gap-1">
            <Clock size={12} strokeWidth={2} />
            {disabledNote}
          </span>
        )}
      </div>
    );
  }

  if (primary) {
    return (
      <Link
        href={href}
        className="group flex items-center justify-between gap-3 px-4 py-4 rounded bg-teal text-white font-mono uppercase text-[14px] tracking-[0.12em] font-bold hover:bg-teal-deep transition-colors"
      >
        <span className="inline-flex items-center gap-2.5">
          <span aria-hidden>{icon}</span>
          {label}
        </span>
        <ArrowRight
          size={16}
          strokeWidth={2}
          className="transition-transform group-hover:translate-x-0.5"
        />
      </Link>
    );
  }

  if (variant === "ghost") {
    return (
      <Link
        href={href}
        className="group flex items-center justify-between gap-3 px-4 py-3 text-navy hover:text-teal-deep transition-colors"
      >
        <span className="inline-flex items-center gap-2.5 font-mono uppercase text-[14px] tracking-[0.1em] font-bold">
          <span className="text-teal" aria-hidden>
            {icon}
          </span>
          {label}
        </span>
        <ArrowRight
          size={14}
          strokeWidth={2}
          className="text-slate/50 group-hover:text-teal group-hover:translate-x-0.5 transition-transform"
          aria-hidden
        />
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 px-4 py-3.5 rounded border-[1.5px] border-rule bg-paper hover:border-teal transition-colors"
    >
      <span className="inline-flex items-center gap-2.5 text-navy font-mono uppercase text-[14px] tracking-[0.1em] font-bold">
        <span className="text-teal" aria-hidden>
          {icon}
        </span>
        {label}
      </span>
      <span className="inline-flex items-center gap-2">
        {count !== undefined && count > 0 && (
          <span className="font-display italic font-extrabold text-[18px] not-uppercase tracking-normal text-navy">
            {count}
          </span>
        )}
        <ArrowRight
          size={16}
          strokeWidth={2}
          className="text-slate/60 group-hover:text-teal group-hover:translate-x-0.5 transition-transform"
          aria-hidden
        />
      </span>
    </Link>
  );
}

function HowBorrowingWorks() {
  const steps: Array<{ title: string; body: string; icon: React.ReactNode }> = [
    {
      title: "Find what you need",
      body: "Browse equipment or consumables, open the SKU, tap Request to submit.",
      icon: <Layers size={14} strokeWidth={1.75} />,
    },
    {
      title: "Wait for staff to approve",
      body: "Your request appears in Waiting on staff above. When approved, you get a 6-character pickup code valid for 24 hours.",
      icon: <Inbox size={14} strokeWidth={1.75} />,
    },
    {
      title: "Show the code at the lab",
      body: "Visit the nursing lab counter; the nurse compares your code on screen with theirs before releasing the item.",
      icon: <Ticket size={14} strokeWidth={1.75} />,
    },
    {
      title: "Return on time",
      body: "Bring borrowed equipment back by the due date. Late returns count toward overdue, which can pause your account.",
      icon: <Clock size={14} strokeWidth={1.75} />,
    },
  ];

  return (
    <section
      id="how-borrowing-works"
      aria-label="How borrowing works"
      className="border-[1.5px] border-rule rounded bg-paper p-6 md:p-7 flex flex-col gap-5 scroll-mt-24"
    >
      <header className="flex items-center gap-2.5">
        <BookOpen size={14} strokeWidth={2} className="text-teal" />
        <h2 className="font-mono uppercase text-caps-md text-slate font-semibold tracking-[0.1em]">
          How borrowing works
        </h2>
      </header>

      <ol className="flex flex-col gap-4">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-4">
            <span
              aria-hidden
              className="shrink-0 size-9 rounded-fab bg-mist border-[1.5px] border-rule flex items-center justify-center font-display italic font-extrabold text-[18px] text-teal"
            >
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display italic font-extrabold text-[17px] text-navy leading-tight">
                {step.title}
              </p>
              <p className="mt-1 text-[14px] text-slate leading-relaxed">
                {step.body}
              </p>
            </div>
            <span className="shrink-0 text-slate/40 mt-1.5" aria-hidden>
              {step.icon}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
