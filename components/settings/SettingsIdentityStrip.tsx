import { Settings as SettingsIcon } from "lucide-react";
import type { ProfileRole } from "@/components/profile/ProfileHeader";

const ROLE_CHIP: Record<
  ProfileRole,
  { label: string; classes: string }
> = {
  staff: {
    label: "Staff",
    classes: "border-teal bg-teal/10 text-teal-deep",
  },
  admin: {
    label: "Admin",
    classes: "border-amber bg-amber/10 text-amber-700",
  },
  student: {
    label: "Student",
    classes: "border-slate bg-slate/10 text-slate",
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]?.[0]?.toUpperCase() ?? "?";
  return (
    (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
  ).toUpperCase();
}

function formatLastSeen(iso: string | null): string {
  if (!iso) return "First session";
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Compact identity strip for /staff/settings + /student/settings. Mirrors
 * the silhouette of `ProfileHeader` (teal border-l-4, paper card, initials
 * avatar, role chip) but with a tighter scale and "Settings" as the h1 —
 * the user already knows their name from the profile page they came from.
 * The meta line carries email + last-seen instead of joined-on.
 */
export function SettingsIdentityStrip({
  role,
  fullName,
  email,
  lastSignInAt,
}: {
  role: ProfileRole;
  fullName: string;
  email: string;
  lastSignInAt: string | null;
}) {
  const chip = ROLE_CHIP[role];
  const trimmed = fullName.trim();

  return (
    <section
      aria-label="Account"
      className="border-l-4 border-teal bg-paper rounded-r px-5 md:px-7 py-4 md:py-5 flex items-center gap-4 md:gap-5"
    >
      <div
        aria-hidden
        className="shrink-0 size-11 md:size-12 rounded-fab bg-teal/15 flex items-center justify-center text-teal-deep font-display italic font-extrabold text-[16px] md:text-[18px]"
      >
        {trimmed.length > 0 ? (
          initials(trimmed)
        ) : (
          <SettingsIcon size={18} strokeWidth={2} />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <h1 className="font-display italic font-extrabold text-[28px] md:text-[32px] text-navy leading-[1.05] tracking-[-0.01em]">
            Settings
          </h1>
          <span
            className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded border ${chip.classes} font-mono uppercase text-caps-sm font-bold tracking-[0.12em]`}
          >
            {chip.label}
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[12px] md:text-[13px] text-slate tracking-[0.02em]">
          <span className="truncate max-w-full">{email}</span>
          <span className="text-slate/40" aria-hidden>·</span>
          <span>Last seen {formatLastSeen(lastSignInAt)}</span>
        </p>
      </div>
    </section>
  );
}
