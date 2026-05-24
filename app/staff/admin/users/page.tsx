import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { AdminUsersRoleFilter } from "@/components/admin/AdminUsersRoleFilter";
import { AdminUsersSearchBar } from "@/components/admin/AdminUsersSearchBar";
import { InviteStaffButton } from "@/components/admin/InviteStaffButton";
import { UsersTable } from "@/components/admin/UsersTable";
import { listUsersForAdmin, type AdminUsersFilter } from "./queries";

const BASE = "/staff/admin/users";

const VALID_ROLES = ["all", "student", "staff", "admin"] as const;

function normalizeRole(raw: string | undefined): AdminUsersFilter["role"] {
  if (!raw) return "all";
  return (VALID_ROLES as readonly string[]).includes(raw)
    ? (raw as AdminUsersFilter["role"])
    : "all";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const role = normalizeRole(sp.role);
  const query = sp.q?.trim() ?? "";

  // Server-side admin gate. Middleware already lets staff + admin through
  // /staff/*; this narrows to admin-only. Non-admins bounce to staff home.
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
  if (!profile || profile.role !== "admin") redirect("/staff/home");

  const rows = await listUsersForAdmin({ role, query });

  const overview =
    rows.length === 0
      ? query || role !== "all"
        ? "NO MATCHES"
        : "NO USERS YET"
      : `${rows.length} ${rows.length === 1 ? "USER" : "USERS"} · ADMIN, STAFF, STUDENT`;

  return (
    <div className="mx-auto max-w-6xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <CatalogHeader
        eyebrow="Admin · Trust"
        title="Manage users"
        overview={overview}
      />

      <p className="text-[14px] text-slate leading-relaxed -mt-3 max-w-2xl">
        Invite new staff by email, promote students, or demote staff back
        to students. Admin accounts are locked — they cannot be demoted
        from this page.
      </p>

      <AdminUsersRoleFilter role={role} query={query} basePath={BASE} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <AdminUsersSearchBar
          initialQuery={query}
          basePath={BASE}
          role={role}
        />
        <InviteStaffButton />
      </div>

      <UsersTable rows={rows} currentUserId={user.id} />
    </div>
  );
}
