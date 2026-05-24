import { User as UserIcon } from "lucide-react";

export type ProfileRole = "staff" | "student" | "admin";

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

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Identity strip — the hero block at the top of /staff/profile and
 * /student/profile. Vertical teal bar runs the full height; small initials
 * avatar inside; name + role chip on the top line; email · student_id ·
 * joined date on the meta line.
 *
 * The page eyebrow ("YOUR ACCOUNT") + SpeedLines lives separately in the
 * page itself, above this strip.
 */
export function ProfileHeader({
  role,
  fullName,
  email,
  studentId,
  staffId,
  joinedAt,
}: {
  role: ProfileRole;
  fullName: string;
  email: string;
  /** Set for student rows; null for staff/admin. */
  studentId?: string | null;
  /** Set for staff/admin rows; null for students. */
  staffId?: string | null;
  joinedAt: string;
}) {
  const chip = ROLE_CHIP[role];
  const trimmed = fullName.trim();
  const displayName = trimmed.length > 0 ? trimmed : "Unnamed account";
  // Whichever institutional ID the row has, render it in the same mono caps
  // slot in the meta line — never both, never none.
  const institutionalId = role === "student" ? studentId : staffId;

  return (
    <section
      aria-label="Identity"
      className="border-l-4 border-teal bg-paper rounded-r px-5 md:px-7 py-5 md:py-6 flex items-center gap-5 md:gap-6"
    >
      <div
        aria-hidden
        className="shrink-0 size-14 md:size-16 rounded-fab bg-teal/15 flex items-center justify-center text-teal-deep font-display italic font-extrabold text-[22px] md:text-[26px]"
      >
        {trimmed.length > 0 ? (
          initials(trimmed)
        ) : (
          <UserIcon size={24} strokeWidth={1.75} />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display italic font-extrabold text-display md:text-[44px] text-navy leading-[1.05] tracking-[-0.01em] min-w-0 break-words">
            {displayName}
          </h1>
          <span
            className={`shrink-0 mt-1.5 inline-flex items-center px-2.5 py-0.5 rounded border ${chip.classes} font-mono uppercase text-caps-sm font-bold tracking-[0.12em]`}
          >
            {chip.label}
          </span>
        </div>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[13px] md:text-[14px] text-slate tracking-[0.02em]">
          <span className="truncate max-w-full">{email}</span>
          {institutionalId && (
            <>
              <span className="text-slate/40" aria-hidden>·</span>
              <span className="uppercase font-semibold tracking-[0.08em]">
                {institutionalId}
              </span>
            </>
          )}
          <span className="text-slate/40" aria-hidden>·</span>
          <span>joined {formatJoined(joinedAt)}</span>
        </p>
      </div>
    </section>
  );
}
