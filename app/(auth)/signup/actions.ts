"use server";

import { createClient } from "@/lib/supabase/server";

export type EmailAvailability =
  | { ok: true; available: boolean }
  | { ok: false; error: string };

/**
 * Pre-check used by the signup form so a duplicate email shows a friendly
 * inline error instead of advancing to the OTP stage for an account that
 * was never created (Supabase's anti-enumeration default behavior).
 *
 * Calls the `check_email_available` RPC defined in migration 0017, which
 * runs SECURITY DEFINER with `set search_path = public` and is granted to
 * the `anon` role. The lookup is case-insensitive and trimmed.
 */
export async function checkEmailAvailable(
  email: string,
): Promise<EmailAvailability> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return { ok: true, available: true };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("check_email_available", {
    p_email: normalized,
  });

  if (error) {
    return {
      ok: false,
      error: "Couldn't check email availability. Try again.",
    };
  }
  return { ok: true, available: Boolean(data) };
}
