import { createClient } from "@/lib/supabase/server";

export type ActiveBorrowStatus = "BORROWED" | "OVERDUE";

export type ActiveBorrowRow = {
  id: string;
  status: ActiveBorrowStatus;
  quantity: number;
  borrowed_at: string;
  expected_return_date: string;
  source_request_id: string | null;
  sku: {
    id: string;
    qr_code: string;
    name: string;
    description: string | null;
    photo_url: string | null;
  };
};

const SELECT =
  "id, status, quantity, borrowed_at, expected_return_date, source_request_id, equipment_sku ( id, qr_code, name, description, photo_url )";

type Row = {
  id: string;
  status: ActiveBorrowStatus;
  quantity: number;
  borrowed_at: string;
  expected_return_date: string;
  source_request_id: string | null;
  equipment_sku: {
    id: string;
    qr_code: string;
    name: string;
    description: string | null;
    photo_url: string | null;
  };
};

export async function listMyActiveBorrows(): Promise<ActiveBorrowRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("borrow_transaction")
    .select(SELECT)
    .eq("student_id", user.id)
    .in("status", ["BORROWED", "OVERDUE"])
    .order("expected_return_date", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    status: r.status,
    quantity: r.quantity,
    borrowed_at: r.borrowed_at,
    expected_return_date: r.expected_return_date,
    source_request_id: r.source_request_id,
    sku: r.equipment_sku,
  }));
}
