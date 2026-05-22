"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SpeedLines } from "@/components/SpeedLines";
import {
  PasswordChecklist,
  isPasswordStrong,
} from "@/components/PasswordChecklist";
import { createClient } from "@/lib/supabase/client";

const EMAIL_DOMAIN = "@cit.edu";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [yearSection, setYearSection] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const emailIsValid = normalizedEmail.endsWith(EMAIL_DOMAIN);
  const passwordIsStrong = isPasswordStrong(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  const emailError =
    email.length > 0 && !emailIsValid
      ? `Must be a ${EMAIL_DOMAIN} address.`
      : undefined;

  const confirmError =
    confirm.length > 0 && password !== confirm
      ? "Passwords don't match."
      : undefined;

  const canSubmit =
    !submitting &&
    fullName.trim().length > 0 &&
    emailIsValid &&
    passwordIsStrong &&
    passwordsMatch;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setFormError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName.trim(),
          year_section: yearSection.trim() || null,
        },
      },
    });

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
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
            ENROLLED
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
          Check your inbox
        </h1>
        <hr className="mt-3 mb-8 w-12" />

        <p className="text-navy">
          We sent a verification link to{" "}
          <span className="font-mono text-[14px]">{normalizedEmail}</span>.
        </p>
        <p className="mt-3 text-slate text-[14px] italic">
          Click the link in that email to activate your account. The message
          may take a minute — check your Spam folder if you don&apos;t see it.
        </p>

        <hr className="my-8" />

        <p className="text-slate text-[14px]">
          Already verified?{" "}
          <Link
            href="/login"
            className="text-navy font-medium hover:underline underline-offset-4 decoration-teal decoration-2"
          >
            Sign in
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 mb-2">
        <SpeedLines className="w-12 h-5" />
        <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
          ENROLL
        </p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
        Create account
      </h1>
      <hr className="mt-3 mb-8 w-12" />

      <p className="text-slate text-[14px] mb-6">
        Fields marked <span className="text-teal font-bold">*</span> are required.
      </p>

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          placeholder="Maria Cruz"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          requiredMark
        />
        <Input
          label="School email"
          type="email"
          autoComplete="email"
          placeholder={`name${EMAIL_DOMAIN}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={emailError}
          required
          requiredMark
        />
        <Input
          label="Year / section"
          autoComplete="off"
          placeholder="BSN 3-A (optional)"
          value={yearSection}
          onChange={(e) => setYearSection(e.target.value)}
        />
        <div>
          <Input
            label="Password"
            type="password"
            autoComplete="new-password"
            placeholder="Create a strong password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setPasswordFocused(true)}
            onBlur={() => setPasswordFocused(false)}
            revealable
            required
            requiredMark
          />
          {(passwordFocused || password.length > 0) && (
            <div className="mt-3">
              <PasswordChecklist password={password} />
            </div>
          )}
        </div>
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={confirmError}
          revealable
          required
          requiredMark
        />

        {formError && (
          <p
            role="alert"
            className="font-mono uppercase text-caps-sm text-red-deep tracking-[0.05em]"
          >
            ⚠  {formError}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={!canSubmit}>
          {submitting ? "Creating…" : "Create account"}
        </Button>
      </form>

      <hr className="my-8" />

      <p className="text-slate text-[14px]">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-navy font-medium hover:underline underline-offset-4 decoration-teal decoration-2"
        >
          Sign in
        </Link>
      </p>
    </>
  );
}
