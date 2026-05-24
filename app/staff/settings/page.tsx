import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SpeedLines } from "@/components/SpeedLines";
import { SettingsIdentityStrip } from "@/components/settings/SettingsIdentityStrip";
import { SectionEyebrow } from "@/components/settings/SectionEyebrow";
import { SettingsEditShell } from "@/components/settings/SettingsEditShell";
import { SessionsBlock } from "@/components/settings/SessionsBlock";
import { EmailNotificationsToggle } from "@/components/settings/EmailNotificationsToggle";
import { updateMyProfile } from "@/app/staff/profile/actions";
import { changeMyPassword, setEmailNotificationsEnabled } from "./actions";

export default async function StaffSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role, staff_id, email_notifications_enabled")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");
  if (profile.role !== "staff" && profile.role !== "admin") {
    redirect("/student/settings");
  }

  const role: "staff" | "admin" =
    profile.role === "admin" ? "admin" : "staff";

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-10 pb-[calc(env(safe-area-inset-bottom,0px)+160px)] md:pb-32">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold tracking-[0.1em]">
            Preferences
          </p>
        </div>
      </header>

      <SettingsIdentityStrip
        role={role}
        fullName={profile.full_name}
        email={profile.email}
        lastSignInAt={user.last_sign_in_at ?? null}
      />

      <SettingsEditShell
        role={role}
        fullName={profile.full_name}
        email={profile.email}
        staffId={profile.staff_id}
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

      {role === "admin" && (
        <Link
          href="/staff/admin/users"
          className="group block border-l-4 border-amber bg-amber/5 rounded-r px-5 md:px-7 py-5 hover:bg-amber/10 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div
              aria-hidden
              className="shrink-0 size-10 rounded-fab bg-amber/15 border-[1.5px] border-amber/40 flex items-center justify-center text-amber-700"
            >
              <ShieldCheck size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-mono uppercase text-caps-sm text-amber-700 font-bold tracking-[0.1em]">
                Admin
              </p>
              <p className="font-display italic font-extrabold text-[20px] text-navy leading-tight mt-0.5">
                Manage users
              </p>
              <p className="text-[13px] text-slate mt-1 leading-snug">
                Promote students to staff or demote staff back to students.
              </p>
            </div>
            <ArrowRight
              size={20}
              strokeWidth={2}
              className="shrink-0 text-amber-700 group-hover:translate-x-0.5 transition-transform"
            />
          </div>
        </Link>
      )}
    </div>
  );
}
