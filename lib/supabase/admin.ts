import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-only admin-API calls
 * (auth.admin.generateLink, auth.admin.deleteUser, etc.). NEVER import this
 * from a "use client" file or expose the key in a response body — the
 * service role bypasses RLS and can read/write any row in any table.
 *
 * Use cases in T.E.K Nurse v1:
 *   - Staff invite flow: generate magic-link tokens + delete pending users
 *     (app/staff/admin/users/actions.ts)
 *   - Email drain cron: read pending_email rows + mark them SENT/FAILED
 *     (app/api/email/drain/route.ts already constructs its own; the
 *      duplication is fine since this file is the canonical helper)
 *
 * The "server-only" import at the top is the actual enforcement — Next.js
 * will error at build time if any client component transitively imports
 * this module.
 */

let cached: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "createAdminClient: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.",
    );
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
