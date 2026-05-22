import Link from "next/link";
import {
  ArrowRight,
  Package,
  Beaker,
  Inbox,
  Activity as ActivityIcon,
  ClipboardList,
  Layers,
  QrCode,
  Clock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getStaffDashboardStats,
  listRecentActivity,
  type ActivityFeedItem,
} from "@/lib/supabase/queries/staff-requests";
import { SpeedLines } from "@/components/SpeedLines";
import { StaffHomeRealtime } from "@/components/staff/StaffHomeRealtime";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

export default async function StaffHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const [stats, activity] = await Promise.all([
    getStaffDashboardStats(),
    listRecentActivity(10),
  ]);

  const overdueTotal =
    stats.overdue.overdue + stats.overdue.due_today_or_earlier;

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-12">
      <StaffHomeRealtime />

      {/* Hero greeting */}
      <header>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Clinical Console · {new Date().toLocaleDateString("en-US", { weekday: "long" })}
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[56px] text-navy leading-[1.05]">
          Welcome back,{" "}
          <span className="text-teal">
            {profile?.full_name ? firstName(profile.full_name) : "staff"}
          </span>
        </h1>
        <p className="mt-3 font-mono uppercase text-caps-sm text-slate tracking-[0.08em]">
          {stats.pending.total === 0 && stats.items_out === 0
            ? "ALL CLEAR · NOTHING WAITING"
            : `${stats.pending.total} WAITING · ${stats.items_out} OUT`}
        </p>
      </header>

      {/* KPI row */}
      <section className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Stat
          label="Items out"
          value={stats.items_out}
          caption={
            overdueTotal > 0
              ? `${overdueTotal} overdue or due today`
              : "All on schedule"
          }
          tone={overdueTotal > 0 ? "alert" : "default"}
          icon={<Package size={18} strokeWidth={1.75} />}
        />
        <Stat
          label="In queue"
          value={stats.pending.total}
          caption={
            stats.pending.total === 0
              ? "Queue clear"
              : `${stats.pending.equipment} equipment · ${stats.pending.consumable} consumable`
          }
          tone={stats.pending.total > 0 ? "active" : "default"}
          icon={<ClipboardList size={18} strokeWidth={1.75} />}
        />
        <Stat
          label="Overdue"
          value={stats.overdue.overdue}
          caption={
            stats.overdue.due_today_or_earlier > 0
              ? `+${stats.overdue.due_today_or_earlier} due today`
              : "None flagged"
          }
          tone={stats.overdue.overdue > 0 ? "alert" : "default"}
          icon={<Clock size={18} strokeWidth={1.75} />}
        />
      </section>

      {/* Two-column layout: actions + activity */}
      <div className="grid gap-10 md:grid-cols-[minmax(0,_280px)_1fr] md:items-start">
        {/* Quick actions */}
        <section className="flex flex-col gap-3">
          <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em] mb-1">
            Quick actions
          </p>
          <ActionLink
            href="/staff/requests"
            label="Pending queue"
            count={stats.pending.total}
            icon={<ClipboardList size={18} strokeWidth={1.75} />}
            primary
          />
          <ActionLink
            href="/staff/inventory"
            label="Browse inventory"
            icon={<Layers size={18} strokeWidth={1.75} />}
          />
          <ActionLink
            href="/staff/scan"
            label="Scan"
            icon={<QrCode size={18} strokeWidth={1.75} />}
          />
        </section>

        {/* Activity feed */}
        <section className="flex flex-col gap-4 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
              <ActivityIcon
                size={14}
                strokeWidth={2}
                className="inline mr-1.5 -mt-0.5 text-teal"
              />
              Recent activity
            </p>
            <p className="font-mono uppercase text-caps-sm text-slate/60 tracking-[0.08em]">
              Live
            </p>
          </div>

          {activity.length === 0 ? (
            <div className="border border-dashed border-rule rounded p-8 text-center">
              <Inbox size={36} strokeWidth={1.5} className="mx-auto text-slate/40" />
              <p className="mt-4 font-display italic font-extrabold text-[18px] text-navy">
                No activity yet
              </p>
              <p className="mt-1 text-[14px] text-slate">
                Borrows + usages will appear here as they happen.
              </p>
            </div>
          ) : (
            <ol className="flex flex-col">
              {activity.map((item, i) => (
                <li key={`${item.kind}:${item.id}`}>
                  <ActivityRow item={item} first={i === 0} />
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  caption,
  tone = "default",
  icon,
}: {
  label: string;
  value: number;
  caption: string;
  tone?: "default" | "active" | "alert";
  icon: React.ReactNode;
}) {
  const numeralTone =
    tone === "alert"
      ? "text-red-deep"
      : tone === "active"
      ? "text-teal"
      : value === 0
      ? "text-slate/60"
      : "text-navy";
  return (
    <div
      className={[
        "rounded border-[1.5px] bg-paper p-5 flex flex-col gap-2",
        tone === "alert" ? "border-red/40" : "border-rule",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono uppercase text-caps-sm text-slate font-semibold tracking-[0.1em]">
          {label}
        </p>
        <span className="text-slate/60" aria-hidden>
          {icon}
        </span>
      </div>
      <p
        className={`font-display italic font-extrabold leading-none text-[64px] md:text-[72px] tracking-[-0.02em] ${numeralTone}`}
      >
        {value}
      </p>
      <p
        className={`font-mono uppercase text-caps-sm tracking-[0.08em] ${
          tone === "alert" ? "text-red-deep font-semibold" : "text-slate/80"
        }`}
      >
        {caption}
      </p>
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
  note,
}: {
  href: string;
  label: string;
  count?: number;
  icon: React.ReactNode;
  primary?: boolean;
  disabled?: boolean;
  note?: string;
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
        {note && (
          <span className="font-mono uppercase text-caps-sm text-slate/70 tracking-[0.08em] inline-flex items-center gap-1">
            <Clock size={12} strokeWidth={2} />
            {note}
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
        <span className="inline-flex items-center gap-2">
          {count !== undefined && count > 0 && (
            <span className="font-display italic font-extrabold text-[20px] not-uppercase tracking-normal">
              {count}
            </span>
          )}
          <ArrowRight
            size={16}
            strokeWidth={2}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </span>
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
      <ArrowRight
        size={16}
        strokeWidth={2}
        className="text-slate/60 group-hover:text-teal transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

function statusLabel(item: ActivityFeedItem): {
  label: string;
  tone: "default" | "alert" | "active";
} {
  if (item.kind === "usage") return { label: "USAGE", tone: "active" };
  switch (item.status) {
    case "BORROWED":
      return { label: "BORROW", tone: "active" };
    case "RETURNED":
      return { label: "RETURN", tone: "default" };
    case "RETURNED_LATE":
      return { label: "RETURN · LATE", tone: "default" };
    case "OVERDUE":
      return { label: "OVERDUE", tone: "alert" };
    case "LOST":
      return { label: "LOST", tone: "alert" };
  }
}

function ActivityRow({
  item,
  first,
}: {
  item: ActivityFeedItem;
  first: boolean;
}) {
  const { label, tone } = statusLabel(item);
  const labelTone =
    tone === "alert"
      ? "text-red-deep"
      : tone === "active"
      ? "text-teal"
      : "text-slate";
  const TypeIcon = item.kind === "usage" ? Beaker : Package;

  return (
    <div
      className={[
        "flex items-start gap-4 py-3.5",
        first ? "" : "border-t border-rule/60",
      ].join(" ")}
    >
      <div className="shrink-0 mt-0.5">
        <span className="font-mono uppercase font-bold tracking-[0.1em] text-caps-sm flex items-center gap-1.5">
          <TypeIcon size={14} strokeWidth={1.75} className={labelTone} />
          <span className={labelTone}>{label}</span>
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap">
          <span className="font-mono text-[13px] tracking-[0.04em] text-navy font-semibold">
            {item.sku_qr}
          </span>
          <span className="text-[15px] text-navy truncate">
            {item.sku_name}
          </span>
        </div>
        <p className="mt-0.5 text-[14px] text-slate">
          {item.student_name}
          <span aria-hidden className="mx-2">·</span>
          <span className="font-mono uppercase text-caps-sm tracking-[0.04em]">
            {item.kind === "usage"
              ? `${item.quantity} ${item.unit}`
              : `Qty ${item.quantity}`}
          </span>
        </p>
      </div>
      <p className="shrink-0 font-mono uppercase text-caps-sm text-slate/70 tracking-[0.06em] mt-0.5">
        {timeAgo(item.when)}
      </p>
    </div>
  );
}
