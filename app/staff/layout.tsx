import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  getUnreadCount,
  listMyNotifications,
} from "@/lib/supabase/queries/notifications";
import { getStaffPendingRequestCount } from "@/lib/supabase/queries/request-counts";
import { TopBar } from "@/components/nav/TopBar";
import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";

export default async function StaffLayout({
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
    pendingRequestCount,
  ] = await Promise.all([
    supabase
      .from("users")
      .select("role, full_name, email")
      .eq("id", user.id)
      .maybeSingle(),
    listMyNotifications({ limit: 10 }),
    getUnreadCount(),
    getStaffPendingRequestCount(),
  ]);

  if (!profile || profile.role !== "staff") redirect("/student/home");

  const navBadges = { "/staff/requests": pendingRequestCount };

  return (
    <div className="min-h-screen">
      <TopBar
        userId={user.id}
        fullName={profile.full_name}
        email={profile.email}
        homeHref="/staff/home"
        initialUnreadCount={initialUnreadCount}
        initialNotifications={initialNotifications}
        notificationsHref="/staff/notifications"
      />
      <SideNav role="staff" badges={navBadges} />
      <main className="md:ml-64 pb-20 md:pb-12">{children}</main>
      <BottomNav role="staff" badges={navBadges} />
    </div>
  );
}
