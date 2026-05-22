import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const { data: profile } = await supabase
    .from("users")
    .select("role, full_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "student") redirect("/staff/home");

  return (
    <div className="min-h-screen">
      <TopBar
        fullName={profile.full_name}
        email={profile.email}
        homeHref="/student/home"
      />
      <SideNav role="student" />
      <main className="md:ml-64 pb-20 md:pb-12">{children}</main>
      <BottomNav role="student" />
    </div>
  );
}
