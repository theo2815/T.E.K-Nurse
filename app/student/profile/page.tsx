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
import { StudentPausedStrip } from "@/components/student/StudentPausedStrip";
import { SpeedLines } from "@/components/SpeedLines";
import { getStudentProfileStats } from "@/lib/supabase/queries/profile-stats";
import { getMyPausedState } from "@/lib/supabase/queries/students";
import { listMyTransactionHistory } from "@/lib/supabase/queries/student-history";

function statusLabel(
  status: "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST",
): { label: string; tone: "default" | "alert" | "success" } {
  switch (status) {
    case "RETURNED":
      return { label: "Returned", tone: "success" };
    case "RETURNED_LATE":
      return { label: "Returned late", tone: "alert" };
    case "OVERDUE":
      return { label: "Overdue", tone: "alert" };
    case "LOST":
      return { label: "Marked lost", tone: "alert" };
    case "BORROWED":
    default:
      return { label: "Borrowed", tone: "default" };
  }
}

export default async function StudentProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role, student_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    redirect("/staff/profile");
  }

  const [stats, pausedState, historyPage] = await Promise.all([
    getStudentProfileStats(user.id),
    getMyPausedState(),
    listMyTransactionHistory({ userId: user.id, pageSize: 6 }),
  ]);

  const vitals: ProfileStat[] = [
    { label: "Borrows", value: stats.lifetime_borrows },
    { label: "Usages", value: stats.lifetime_usages },
    {
      label: "Out now",
      value: stats.currently_out,
      tone: stats.currently_out > 0 ? "active" : "default",
    },
    {
      label: "Lost",
      value: stats.items_lost,
      tone: stats.items_lost > 0 ? "alert" : "default",
    },
  ];

  const transmissions: TransmissionEntry[] = historyPage.rows.map((r) => {
    if (r.kind === "borrow") {
      const status = statusLabel(r.status);
      return {
        id: r.id,
        at: r.when,
        label: status.label,
        refId: r.sku.qr_code || null,
        detail: r.sku.name,
        tone: status.tone,
      };
    }
    return {
      id: r.id,
      at: r.when,
      label: "Used",
      refId: r.sku.qr_code || null,
      detail: r.sku.name,
      tone: "default",
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
        role="student"
        fullName={profile.full_name}
        email={profile.email}
        studentId={profile.student_id}
        joinedAt={stats.member_since}
      />

      {pausedState.paused && (
        <StudentPausedStrip
          reason={pausedState.reason}
          suspendedAt={pausedState.suspendedAt}
        />
      )}

      <ProfileActivityBand title="Vitals" stats={vitals} />

      <TransmissionLog
        entries={transmissions}
        seeAllHref="/student/history"
        emptyHint="Items you borrow, use, or return will appear here as they happen."
      />

      <QuickActionsStrip settingsHref="/student/settings" />
    </div>
  );
}
