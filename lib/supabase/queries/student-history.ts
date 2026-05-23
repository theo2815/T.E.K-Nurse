import { createClient } from "@/lib/supabase/server";
import type {
  Paged,
} from "@/lib/supabase/queries/reports";
import type { StudentHistoryItem } from "@/lib/supabase/queries/students";

export const STUDENT_HISTORY_PAGE_SIZE = 25;

export type MyHistoryStats = {
  lifetime_borrows: number;
  lifetime_usages: number;
  lost_count: number;
};

/**
 * Lightweight counts for the hero stat row. Three head-only queries scoped
 * to the current user via RLS (student policies restrict reads to own rows).
 */
export async function getMyHistoryStats(
  userId: string,
): Promise<MyHistoryStats> {
  const supabase = await createClient();
  const [borrowsRes, usagesRes, lostRes] = await Promise.all([
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId),
    supabase
      .from("consumable_usage")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId),
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("student_id", userId)
      .eq("status", "LOST"),
  ]);
  if (borrowsRes.error) throw borrowsRes.error;
  if (usagesRes.error) throw usagesRes.error;
  if (lostRes.error) throw lostRes.error;

  return {
    lifetime_borrows: borrowsRes.count ?? 0,
    lifetime_usages: usagesRes.count ?? 0,
    lost_count: lostRes.count ?? 0,
  };
}

/**
 * Merged borrow + consumable usage events for the current student, newest
 * first. Mirrors listStudentTransactionHistory (staff-side) — pulls up to
 * pageSize * page * 2 rows from each source then trims after a stable merge.
 *
 * Reads via the authenticated client, so RLS restricts to the student's own
 * rows automatically. No need for an explicit student_id filter.
 */
export async function listMyTransactionHistory(opts: {
  userId: string;
  page?: number;
  pageSize?: number;
}): Promise<Paged<StudentHistoryItem>> {
  const supabase = await createClient();
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = opts.pageSize ?? STUDENT_HISTORY_PAGE_SIZE;
  const limit = pageSize * page;

  const [borrowsRes, usagesRes, borrowsCountRes, usagesCountRes] =
    await Promise.all([
      supabase
        .from("borrow_transaction")
        .select(
          "id, quantity, status, borrowed_at, returned_at, expected_return_date, sku:equipment_sku_id ( id, qr_code, name )",
        )
        .eq("student_id", opts.userId)
        .order("borrowed_at", { ascending: false })
        .limit(limit + pageSize),
      supabase
        .from("consumable_usage")
        .select(
          "id, used_at, quantity_used, sku:consumable_sku_id ( id, qr_code, name, unit )",
        )
        .eq("student_id", opts.userId)
        .order("used_at", { ascending: false })
        .limit(limit + pageSize),
      supabase
        .from("borrow_transaction")
        .select("id", { count: "exact", head: true })
        .eq("student_id", opts.userId),
      supabase
        .from("consumable_usage")
        .select("id", { count: "exact", head: true })
        .eq("student_id", opts.userId),
    ]);
  if (borrowsRes.error) throw borrowsRes.error;
  if (usagesRes.error) throw usagesRes.error;
  if (borrowsCountRes.error) throw borrowsCountRes.error;
  if (usagesCountRes.error) throw usagesCountRes.error;

  type SkuEqJoin =
    | { id: string; qr_code: string; name: string }
    | { id: string; qr_code: string; name: string }[]
    | null;
  type SkuCnJoin =
    | { id: string; qr_code: string; name: string; unit: string }
    | { id: string; qr_code: string; name: string; unit: string }[]
    | null;
  type BR = {
    id: string;
    quantity: number;
    status: "BORROWED" | "RETURNED" | "RETURNED_LATE" | "OVERDUE" | "LOST";
    borrowed_at: string;
    returned_at: string | null;
    expected_return_date: string;
    sku: SkuEqJoin;
  };
  type UR = {
    id: string;
    used_at: string;
    quantity_used: number;
    sku: SkuCnJoin;
  };

  function unwrapEq(s: SkuEqJoin) {
    if (!s) return { id: "", qr_code: "", name: "Unknown" };
    return Array.isArray(s) ? (s[0] ?? { id: "", qr_code: "", name: "Unknown" }) : s;
  }
  function unwrapCn(s: SkuCnJoin) {
    if (!s) return { id: "", qr_code: "", name: "Unknown", unit: "" };
    return Array.isArray(s)
      ? (s[0] ?? { id: "", qr_code: "", name: "Unknown", unit: "" })
      : s;
  }

  const borrowItems: StudentHistoryItem[] = (
    (borrowsRes.data ?? []) as unknown as BR[]
  ).map((r) => ({
    kind: "borrow",
    id: r.id,
    when:
      r.status === "RETURNED" || r.status === "RETURNED_LATE"
        ? (r.returned_at ?? r.borrowed_at)
        : r.borrowed_at,
    status: r.status,
    quantity: r.quantity,
    returned_at: r.returned_at,
    expected_return_date: r.expected_return_date,
    sku: unwrapEq(r.sku),
  }));

  const usageItems: StudentHistoryItem[] = (
    (usagesRes.data ?? []) as unknown as UR[]
  ).map((r) => ({
    kind: "usage",
    id: r.id,
    when: r.used_at,
    quantity: r.quantity_used,
    sku: unwrapCn(r.sku),
  }));

  const merged = [...borrowItems, ...usageItems].sort((a, b) =>
    b.when.localeCompare(a.when),
  );

  const total =
    (borrowsCountRes.count ?? 0) + (usagesCountRes.count ?? 0);
  const offset = (page - 1) * pageSize;
  const sliced = merged.slice(offset, offset + pageSize);

  return {
    rows: sliced,
    total,
    page,
    pageSize,
  };
}
