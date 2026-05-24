import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SpeedLines } from "@/components/SpeedLines";
import { SettingsIdentityStrip } from "@/components/settings/SettingsIdentityStrip";
import { SectionEyebrow } from "@/components/settings/SectionEyebrow";
import { SettingsEditShell } from "@/components/settings/SettingsEditShell";
import { SessionsBlock } from "@/components/settings/SessionsBlock";
import { EmailNotificationsToggle } from "@/components/settings/EmailNotificationsToggle";
import { StudentPausedStrip } from "@/components/student/StudentPausedStrip";
import { getMyPausedState } from "@/lib/supabase/queries/students";
import { updateMyProfile } from "@/app/student/profile/actions";
import { changeMyPassword, setEmailNotificationsEnabled } from "./actions";

export default async function StudentSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role, student_id, email_notifications_enabled")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");
  if (profile.role !== "student") {
    redirect("/staff/settings");
  }

  const pausedState = await getMyPausedState();

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10 pb-32 md:pb-32">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Preferences
          </p>
        </div>
      </header>

      <SettingsIdentityStrip
        role="student"
        fullName={profile.full_name}
        email={profile.email}
        lastSignInAt={user.last_sign_in_at ?? null}
      />

      {pausedState.paused && (
        <StudentPausedStrip
          reason={pausedState.reason}
          suspendedAt={pausedState.suspendedAt}
        />
      )}

      <SettingsEditShell
        role="student"
        fullName={profile.full_name}
        email={profile.email}
        studentId={profile.student_id ?? ""}
        updateProfile={updateMyProfile}
        changePassword={changeMyPassword}
      />

      <section
        aria-labelledby="notifications-heading"
        className="flex flex-col gap-5"
      >
        <SectionEyebrow
          id="notifications-heading"
          label="Notifications"
          hint="How T.E.K Nurse reaches you outside the app."
        />
        <EmailNotificationsToggle
          initialEnabled={profile.email_notifications_enabled ?? true}
          action={setEmailNotificationsEnabled}
        />
      </section>

      <section
        aria-labelledby="sessions-heading"
        className="flex flex-col gap-5"
      >
        <SectionEyebrow
          id="sessions-heading"
          label="Sessions"
          hint="Manage where you're signed in."
        />
        <SessionsBlock />
      </section>
    </div>
  );
}
