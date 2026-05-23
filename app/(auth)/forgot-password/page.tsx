"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SpeedLines } from "@/components/SpeedLines";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      },
    );

    setSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
            RECOVERY
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
          Link sent
        </h1>
        <hr className="mt-3 mb-8 w-12" />

        <p className="text-navy">
          If an account exists for{" "}
          <span className="font-mono text-[14px]">{email.trim().toLowerCase()}</span>
          , we&apos;ve sent a password reset link.
        </p>
        <p className="mt-3 text-slate text-[14px] italic">
          The link is valid for one hour. Check your Spam folder if you
          don&apos;t see it.
        </p>

        <hr className="my-8" />

        <Link
          href="/login"
          className="text-navy font-medium hover:underline underline-offset-4 decoration-teal decoration-2 text-[14px]"
        >
          ← Back to sign in
        </Link>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <SpeedLines className="w-12 h-5" />
        <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
          RECOVERY
        </p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
        Forgot password
      </h1>
      <hr className="mt-3 mb-8 w-12" />

      <p className="text-slate text-[14px] mb-6">
        Enter the email tied to your account and we&apos;ll send a reset link.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="name@cit.edu"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        {error && (
          <p
            role="alert"
            className="font-mono uppercase text-caps-sm text-red-deep tracking-[0.05em]"
          >
            ⚠  {error}
          </p>
        )}

        <Button type="submit" variant="primary" loading={submitting}>
          Send reset link
        </Button>
      </form>

      <hr className="my-8" />

      <Link
        href="/login"
        className="text-navy font-medium hover:underline underline-offset-4 decoration-teal decoration-2 text-[14px]"
      >
        ← Back to sign in
      </Link>
    </>
  );
}
