import { createClient } from "@/lib/supabase/server";

export type ActiveLoanStatus = "BORROWED" | "OVERDUE";

export type ActiveLoanRow = {
  id: string;
  quantity: number;
  status: ActiveLoanStatus;
  borrowed_at: string;
  expected_return_date: string;
  student: {
    id: string;
    full_name: string;
    email: string;
    year_section: string | null;
  };
  sku: {
    id: string;
    qr_code: string;
    name: string;
    photo_url: string | null;
  };
};

type StudentJoin =
  | { id: string; full_name: string; email: string; year_section: string | null }
  | { id: string; full_name: string; email: string; year_section: string | null }[]
  | null;

type SkuJoin =
  | { id: string; qr_code: string; name: string; photo_url: string | null }
  | { id: string; qr_code: string; name: string; photo_url: string | null }[]
  | null;

function unwrapStudent(s: StudentJoin): ActiveLoanRow["student"] {
  if (!s) return { id: "", full_name: "Unknown", email: "", year_section: null };
  const u = Array.isArray(s) ? s[0] : s;
  return u ?? { id: "", full_name: "Unknown", email: "", year_section: null };
}

function unwrapSku(s: SkuJoin): ActiveLoanRow["sku"] {
  if (!s) return { id: "", qr_code: "", name: "Unknown item", photo_url: null };
  const u = Array.isArray(s) ? s[0] : s;
  return u ?? { id: "", qr_code: "", name: "Unknown item", photo_url: null };
}

export async function listActiveLoans(opts: {
  stage: "active" | "overdue";
}): Promise<ActiveLoanRow[]> {
  const supabase = await createClient();
  const statusFilter =
    opts.stage === "overdue" ? ["OVERDUE"] : ["BORROWED", "OVERDUE"];

  const { data, error } = await supabase
    .from("borrow_transaction")
    .select(
      "id, quantity, status, borrowed_at, expected_return_date, " +
        "student:student_id ( id, full_name, email, year_section ), " +
        "sku:equipment_sku_id ( id, qr_code, name, photo_url )",
    )
    .in("status", statusFilter)
    .order("expected_return_date", { ascending: true });
  if (error) throw error;

  type Row = {
    id: string;
    quantity: number;
    status: ActiveLoanStatus;
    borrowed_at: string;
    expected_return_date: string;
    student: StudentJoin;
    sku: SkuJoin;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    quantity: r.quantity,
    status: r.status,
    borrowed_at: r.borrowed_at,
    expected_return_date: r.expected_return_date,
    student: unwrapStudent(r.student),
    sku: unwrapSku(r.sku),
  }));
}

export async function getActiveLoanCounts(): Promise<{
  active: number;
  overdue: number;
}> {
  const supabase = await createClient();
  const [active, overdue] = await Promise.all([
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .in("status", ["BORROWED", "OVERDUE"]),
    supabase
      .from("borrow_transaction")
      .select("id", { count: "exact", head: true })
      .eq("status", "OVERDUE"),
  ]);
  if (active.error) throw active.error;
  if (overdue.error) throw overdue.error;
  return { active: active.count ?? 0, overdue: overdue.count ?? 0 };
}
