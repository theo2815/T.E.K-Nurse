"use client";

import { useProgressRouter } from "@/lib/use-progress-router";
import { FilterChipRow } from "@/components/ui/FilterChipRow";

const CHIPS = [
  { value: "all", label: "All" },
  { value: "student", label: "Students" },
  { value: "staff", label: "Staff" },
  { value: "admin", label: "Admin" },
];

/**
 * Role-scoped filter strip for /staff/admin/users. URL-driven via `?role=`.
 * Preserves `?q=` when switching roles.
 */
export function AdminUsersRoleFilter({
  role,
  query,
  basePath,
}: {
  role: string;
  query: string;
  basePath: string;
}) {
  const router = useProgressRouter();

  function onChange(next: string) {
    const params = new URLSearchParams();
    if (next && next !== "all") params.set("role", next);
    if (query.trim()) params.set("q", query);
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
  }

  return (
    <FilterChipRow chips={CHIPS} value={role || "all"} onChange={onChange} />
  );
}
