import "server-only";
import { renderEmailPayload } from "./render";
import { getEmailFrom, getTransporter } from "./transporter";
import type { EmailPayload } from "./types";

export type PendingEmailRow = {
  id: string;
  to_email: string;
  to_user_id: string | null;
  template: string;
  payload: Record<string, unknown>;
  status: "QUEUED" | "SENT" | "FAILED";
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
};

export type SendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; error: string };

function parseAllowlist(): string[] {
  const raw = process.env.EMAIL_DEV_ALLOWLIST ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
}

function applyDevGuardrail(
  to: string,
  subject: string,
): { to: string; subject: string; headers: Record<string, string> } {
  if (process.env.NODE_ENV === "production") {
    return { to, subject, headers: {} };
  }

  const allowlist = parseAllowlist();
  if (allowlist.length === 0) {
    throw new Error(
      "Email worker misconfigured: NODE_ENV !== production but EMAIL_DEV_ALLOWLIST is empty. Set it to a comma-separated list of safe-to-receive addresses in .env.local before draining.",
    );
  }

  if (allowlist.includes(to.toLowerCase())) {
    return { to, subject, headers: { "X-Tek-Nurse-Env": "development" } };
  }

  return {
    to: allowlist[0],
    subject: `[DEV → ${to}] ${subject}`,
    headers: {
      "X-Original-To": to,
      "X-Tek-Nurse-Env": "development",
    },
  };
}

export async function sendQueuedEmail(row: PendingEmailRow): Promise<SendResult> {
  let rendered: { subject: string; html: string; text: string };
  try {
    const payload = { template: row.template, payload: row.payload } as EmailPayload;
    rendered = await renderEmailPayload(payload);
  } catch (err) {
    return {
      ok: false,
      error: `render failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }

  let dest: { to: string; subject: string; headers: Record<string, string> };
  try {
    dest = applyDevGuardrail(row.to_email, rendered.subject);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    const info = await getTransporter().sendMail({
      from: getEmailFrom(),
      to: dest.to,
      subject: dest.subject,
      html: rendered.html,
      text: rendered.text,
      headers: dest.headers,
    });
    return { ok: true, messageId: info.messageId ?? null };
  } catch (err) {
    return {
      ok: false,
      error: `smtp failed: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}
