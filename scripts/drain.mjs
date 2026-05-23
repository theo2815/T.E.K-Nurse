#!/usr/bin/env node
// Local-dev helper: POSTs to http://localhost:3000/api/email/drain with the
// CRON_SECRET from .env.local. Run with `npm run email:drain` while the dev
// server is up. pg_cron cannot reach localhost, so this replaces it in dev.

import { config as loadDotenv } from "dotenv";
import { resolve } from "node:path";

loadDotenv({ path: resolve(process.cwd(), ".env.local") });

const url = process.env.DRAIN_URL ?? "http://localhost:3000/api/email/drain";
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error(
    "CRON_SECRET is not set in .env.local. Generate one with:\n" +
      "  node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"\n" +
      "Then paste it into .env.local AND set it as a Supabase Postgres GUC " +
      "(see supabase/README.md).",
  );
  process.exit(1);
}

try {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  console.log(`[${res.status}] ${text}`);
  process.exit(res.ok ? 0 : 1);
} catch (err) {
  console.error(
    `Drain request failed: ${err instanceof Error ? err.message : String(err)}`,
  );
  console.error(`Is the dev server running at ${url}? (npm run dev)`);
  process.exit(1);
}
