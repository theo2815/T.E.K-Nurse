import { createClient } from "@/lib/supabase/server";

export type AdminUserRow = {
  id: string;
  full_name: string;
  email: string;
  role: "student" | "staff" | "admin";
  student_id: string | null;
  staff_id: string | null;
  is_active: boolean;
  created_at: string;
  /** Null unless the user came through the staff-invite flow (Phase
   *  11.5d-inv). When set with invite_accepted_at = null, the row is a
   *  "pending invite" — render the dedicated chip + Resend/Cancel actions. */
  invited_at: string | null;
  invite_accepted_at: string | null;
};

export type AdminUsersFilter = {
  /** "all" returns everyone; "student" / "staff" / "admin" narrows. */
  role: "all" | "student" | "staff" | "admin";
  /** Trimmed query — empty string returns all. Matches name OR email
   *  case-insensitively. */
  query: string;
};

/**
 * List users for the /staff/admin/users management surface. Returns up to 100
 * rows ordered by role priority (admin first, then staff, then student) and
 * full_name. The 100-row cap is a v1 simplification — the lab has fewer than
 * 50 active members and the page is admin-only.
 */
export async function listUsersForAdmin(
  filter: AdminUsersFilter,
): Promise<AdminUserRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("users")
    .select(
      "id, full_name, email, role, student_id, staff_id, is_active, created_at, invited_at, invite_accepted_at",
    )
    .order("created_at", { ascending: true })
    .limit(100);

  if (filter.role !== "all") {
    q = q.eq("role", filter.role);
  }

  const trimmed = filter.query.trim();
  if (trimmed.length > 0) {
    const escaped = trimmed.replace(/[%_,]/g, (m) => `\\${m}`);
    const pattern = `%${escaped}%`;
    q = q.or(`full_name.ilike.${pattern},email.ilike.${pattern}`);
  }

  const { data, error } = await q;
  if (error) throw error;

  const rows = (data ?? []) as AdminUserRow[];
  const rolePriority: Record<AdminUserRow["role"], number> = {
    admin: 0,
    staff: 1,
    student: 2,
  };
  return rows.sort((a, b) => {
    const dr = rolePriority[a.role] - rolePriority[b.role];
    if (dr !== 0) return dr;
    return a.full_name.localeCompare(b.full_name);
  });
}
