#!/usr/bin/env node
// Local-dev helper: invokes the three Phase 9 scheduled-job RPCs against the
// dev Supabase project, then drains any emails they enqueued so you can see
// real test mail in your inbox without waiting for pg_cron.
//
// Run with `npm run cron:poke` while the dev server is up.
//
// pg_cron jobs in Supabase Cloud are scheduled to fire daily at 01:00 UTC
// (09:00 PHT) for the cadence + alerts jobs, and every 15 minutes for the
// expiry job. This script lets you fire all three on demand during dev so
// you can poke a borrow_transaction's expected_return_date back and watch
// the cadence land.

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

loadDotenv({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function call(name) {
  const started = Date.now();
  const { data, error } = await supabase.rpc(name);
  const ms = Date.now() - started;
  if (error) {
    console.error(`✗ ${name} (${ms}ms): ${error.message}`);
    return false;
  }
  console.log(`✓ ${name} (${ms}ms): ${JSON.stringify(data)}`);
  return true;
}

const results = await Promise.all([
  call("run_request_expiry"),
  call("run_overdue_cadence"),
  call("run_inventory_alerts"),
]);

const allOk = results.every(Boolean);

// Trigger an immediate email drain so the rows just enqueued by the cron
// functions land in the inbox in this same poke. Best-effort — drain failures
// just print a warning and don't fail the overall script.
const drainUrl = process.env.DRAIN_URL ?? "http://localhost:3000/api/email/drain";
const cronSecret = process.env.CRON_SECRET;

if (cronSecret) {
  try {
    const res = await fetch(drainUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${cronSecret}` },
    });
    const text = await res.text();
    console.log(`→ drain [${res.status}] ${text}`);
  } catch (err) {
    console.warn(
      `→ drain skipped: ${err instanceof Error ? err.message : String(err)} ` +
        `(is the dev server running at ${drainUrl}?)`,
    );
  }
} else {
  console.warn(
    "→ drain skipped: CRON_SECRET not set in .env.local. Run `npm run email:drain` manually.",
  );
}

process.exit(allOk ? 0 : 1);
