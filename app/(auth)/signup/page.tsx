"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput, type OtpInputHandle } from "@/components/ui/OtpInput";
import { SpeedLines } from "@/components/SpeedLines";
import {
  PasswordChecklist,
  isPasswordStrong,
} from "@/components/PasswordChecklist";
import { createClient } from "@/lib/supabase/client";

const EMAIL_DOMAIN = "@cit.edu";
const RESEND_COOLDOWN_SECONDS = 60;

type Stage = "form" | "otp";

export default function SignupPage() {
  const router = useProgressRouter();
  const otpRef = useRef<OtpInputHandle>(null);

  const [stage, setStage] = useState<Stage>("form");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [yearSection, setYearSection] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otp, setOtp] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [resendCooldown]);

  async function onSubmitForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setFormError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
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

    setOtp("");
    setStage("otp");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyCode(code: string) {
    setFormError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: normalizedEmail,
      token: code,
      type: "signup",
    });

    setSubmitting(false);

    if (verifyError) {
      setFormError(verifyError.message);
      setOtp("");
      otpRef.current?.clear();
      return;
    }

    // Signed in — middleware will route to /staff/home or /student/home.
    router.replace("/");
    router.refresh();
  }

  async function onSubmitOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otp.length !== 6 || submitting) return;
    await verifyCode(otp);
  }

  async function onResend() {
    if (resendCooldown > 0 || submitting) return;
    setFormError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: normalizedEmail,
    });

    setSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setOtp("");
    otpRef.current?.clear();
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  if (stage === "otp") {
    return (
      <>
        <div className="flex items-center gap-3 mb-2">
          <SpeedLines className="w-12 h-5" />
          <p className="font-mono uppercase text-caps-sm text-teal font-semibold">
            ENROLL · STEP 2
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
          Verify your email
        </h1>
        <hr className="mt-3 mb-8 w-12" />

        <p className="text-navy mb-6">
          We sent a 6-digit code to{" "}
          <span className="font-mono text-[14px]">{normalizedEmail}</span>.
          Enter it below to activate your account.
        </p>

        <form onSubmit={onSubmitOtp} className="flex flex-col gap-5" noValidate>
          <OtpInput
            ref={otpRef}
            value={otp}
            onChange={setOtp}
            onComplete={verifyCode}
            disabled={submitting}
            error={formError ?? undefined}
            autoFocus
            label="6-digit code"
          />

          <Button
            type="submit"
            variant="primary"
            disabled={otp.length !== 6}
            loading={submitting}
          >
            Verify and continue
          </Button>
        </form>

        <hr className="my-8" />

        <div className="flex items-center justify-between text-[14px]">
          <button
            type="button"
            onClick={onResend}
            disabled={resendCooldown > 0 || submitting}
            className="text-navy font-medium hover:underline underline-offset-4 decoration-teal decoration-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:no-underline"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : "Resend code →"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("form");
              setOtp("");
              setFormError(null);
            }}
            className="text-slate hover:text-navy text-[13px]"
          >
            Back
          </button>
        </div>
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

      <form onSubmit={onSubmitForm} className="flex flex-col gap-5" noValidate>
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

        <Button type="submit" variant="primary" disabled={!canSubmit} loading={submitting}>
          Create account
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
