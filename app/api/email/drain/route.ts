import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "node:crypto";
import { sendQueuedEmail, type PendingEmailRow } from "@/lib/email/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 5;
const BATCH_LIMIT = 20;

function constantTimeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return timingSafeEqual(aBuf, bBuf);
}

function unauthorized(): Response {
  return new Response("Unauthorized", { status: 401 });
}

export async function POST(req: Request): Promise<Response> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET not configured on server" },
      { status: 500 },
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!constantTimeEqualString(authHeader, `Bearer ${cronSecret}`)) {
    return unauthorized();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { error: "Supabase env vars not configured" },
      { status: 500 },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimed, error: fetchError } = await supabase.rpc(
    "fetch_pending_emails",
    { p_limit: BATCH_LIMIT },
  );

  if (fetchError) {
    return Response.json(
      { error: `fetch failed: ${fetchError.message}` },
      { status: 500 },
    );
  }

  const rows = (claimed ?? []) as PendingEmailRow[];
  let sent = 0;
  let retried = 0;
  let failedTerminal = 0;

  for (const row of rows) {
    const result = await sendQueuedEmail(row);

    if (result.ok) {
      const { error: updateError } = await supabase
        .from("pending_email")
        .update({
          status: "SENT",
          sent_at: new Date().toISOString(),
          last_error: null,
        })
        .eq("id", row.id);

      if (updateError) {
        console.error(
          `[email/drain] sent OK but failed to mark SENT for ${row.id}: ${updateError.message}`,
        );
      }
      sent += 1;
      continue;
    }

    const isTerminal = row.attempts >= MAX_ATTEMPTS;
    const { error: updateError } = await supabase
      .from("pending_email")
      .update({
        status: isTerminal ? "FAILED" : "QUEUED",
        last_error: result.error.slice(0, 1000),
      })
      .eq("id", row.id);

    if (updateError) {
      console.error(
        `[email/drain] send failed AND status update failed for ${row.id}: ${updateError.message}`,
      );
    }

    if (isTerminal) failedTerminal += 1;
    else retried += 1;
  }

  return Response.json({
    drained: rows.length,
    sent,
    retried,
    failed_terminal: failedTerminal,
  });
}
