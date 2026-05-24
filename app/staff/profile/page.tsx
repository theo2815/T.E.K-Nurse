import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import {
  ProfileActivityBand,
  type ProfileStat,
} from "@/components/profile/ProfileActivityBand";
import {
  TransmissionLog,
  type TransmissionEntry,
} from "@/components/profile/TransmissionLog";
import { QuickActionsStrip } from "@/components/profile/QuickActionsStrip";
import { SpeedLines } from "@/components/SpeedLines";
import {
  getStaffProfileStats,
  getRecentStaffActivity,
} from "@/lib/supabase/queries/profile-stats";
import {
  actionLabel,
  actionTone,
} from "@/components/audit/action-labels";

function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    year: "2-digit",
    month: "short",
  });
}

export default async function StaffProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role, staff_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");
  if (profile.role !== "staff" && profile.role !== "admin") {
    redirect("/student/profile");
  }

  const [stats, activity] = await Promise.all([
    getStaffProfileStats(user.id),
    getRecentStaffActivity(user.id, 6),
  ]);

  const vitals: ProfileStat[] = [
    {
      label: "Approved",
      value: stats.borrows_approved,
      tone: stats.borrows_approved > 0 ? "active" : "default",
    },
    {
      label: "Issued",
      value: stats.suspensions_issued,
      tone: stats.suspensions_issued > 0 ? "alert" : "default",
    },
    {
      label: "Since",
      value: formatMonthYear(stats.member_since),
    },
  ];

  const transmissions: TransmissionEntry[] = activity.map((a) => {
    const tone = actionTone(a.action_type);
    return {
      id: a.id,
      at: a.timestamp,
      label: actionLabel(a.action_type),
      detail: a.notes && a.notes.trim().length > 0 ? `"${a.notes}"` : null,
      tone,
    };
  });

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Your account
          </p>
        </div>
      </header>

      <ProfileHeader
        role={profile.role === "admin" ? "admin" : "staff"}
        fullName={profile.full_name}
        email={profile.email}
        staffId={profile.staff_id}
        joinedAt={stats.member_since}
      />

      <ProfileActivityBand title="Vitals" stats={vitals} />

      <TransmissionLog
        entries={transmissions}
        seeAllHref="/staff/audit-log"
        emptyHint="Your approvals, releases, and other staff actions will appear here as they happen."
      />

      <QuickActionsStrip settingsHref="/staff/settings" />
    </div>
  );
}
