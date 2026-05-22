"use server";

import { createClient } from "@/lib/supabase/server";
import { getScanTarget, type ScanTarget } from "@/lib/supabase/queries/scan";

type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function assertStaff(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "staff") {
    return { ok: false, error: "Staff only." };
  }
  return { ok: true, userId: user.id };
}

/**
 * Resolve a scanned (or picked) QR into the action target — SKU details +
 * live state. Used by the /staff/scan client shell to choose which modal
 * to open (Borrow / Return / Override / Usage).
 */
export async function resolveScanTargetAction(
  qr: string,
): Promise<Result<ScanTarget>> {
  const gate = await assertStaff();
  if (!gate.ok) return { ok: false, error: gate.error };
  try {
    const data = await getScanTarget(qr);
    return { ok: true, data };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Resolve failed.";
    return { ok: false, error: msg };
  }
}
