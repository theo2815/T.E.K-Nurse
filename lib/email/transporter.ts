import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let cached: Transporter | null = null;

function readEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Email worker misconfigured: ${name} is not set. See .env.local.example for the full Brevo SMTP block.`,
    );
  }
  return value;
}

export function getTransporter(): Transporter {
  if (cached) return cached;

  const host = readEnv("SMTP_HOST");
  const port = Number(readEnv("SMTP_PORT"));
  const user = readEnv("SMTP_USER");
  const pass = readEnv("SMTP_PASS");

  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Email worker misconfigured: SMTP_PORT must be a positive integer (got "${process.env.SMTP_PORT}").`);
  }

  cached = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cached;
}

export function getEmailFrom(): string {
  return readEnv("EMAIL_FROM");
}
