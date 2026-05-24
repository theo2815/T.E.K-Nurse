import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * (print) route group — escapes the staff app shell (no TopBar / SideNav /
 * BottomNav). Used by the QR print preview pages so the printed output
 * shows only the sheet itself.
 *
 * Auth gate: staff-only. Students never reach print pages.
 *
 * Print CSS strategy:
 *   - On screen: mist background, max-width container, toolbar visible.
 *   - On print: body is pure white, toolbar hidden via `print:hidden`,
 *     `@page` margin zero so the sheet's own padding defines the printable
 *     border. Components that should not appear in print get `print:hidden`.
 */
export default async function PrintLayout({
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
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "staff") redirect("/student/home");

  return (
    <div className="min-h-screen bg-mist print:bg-white">
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body {
            background: #FFFFFF !important;
            background-image: none !important;
          }
        }
      `}</style>
      <main>{children}</main>
    </div>
  );
}
