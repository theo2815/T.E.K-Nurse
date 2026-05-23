import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUnreadCount,
  listMyNotifications,
} from "@/lib/supabase/queries/notifications";
import { getStudentAwaitingPickupCount } from "@/lib/supabase/queries/request-counts";
import { TopBar } from "@/components/nav/TopBar";
import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    initialNotifications,
    initialUnreadCount,
    awaitingPickupCount,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle(),
    listMyNotifications({ limit: 10 }),
    getUnreadCount(),
    getStudentAwaitingPickupCount(),
  ]);

  if (!profile || profile.role !== "student") redirect("/staff/home");

  const navBadges = { "/student/requests": awaitingPickupCount };

  return (
    <div className="min-h-screen">
      <TopBar
        userId={user.id}
        fullName={profile.full_name}
        email={profile.email}
        homeHref="/student/home"
        initialUnreadCount={initialUnreadCount}
        initialNotifications={initialNotifications}
        notificationsHref="/student/notifications"
      />
      <SideNav role="student" badges={navBadges} />
      <main className="md:ml-64 pb-20 md:pb-12">{children}</main>
      <BottomNav role="student" badges={navBadges} />
    </div>
  );
}
