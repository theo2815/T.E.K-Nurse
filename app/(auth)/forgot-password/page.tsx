"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput, type OtpInputHandle } from "@/components/ui/OtpInput";
import { SpeedLines } from "@/components/SpeedLines";
import { createClient } from "@/lib/supabase/client";

const RESEND_COOLDOWN_SECONDS = 60;

type Stage = "email" | "otp";

export default function ForgotPasswordPage() {
  const router = useProgressRouter();
  const otpRef = useRef<OtpInputHandle>(null);

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(
      () => setResendCooldown((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [resendCooldown]);

  async function requestCode(targetEmail: string) {
    const supabase = createClient();
    const { error: authError } =
      await supabase.auth.resetPasswordForEmail(targetEmail);
    return authError;
  }

  async function onSubmitEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const normalized = email.trim().toLowerCase();
    const authError = await requestCode(normalized);

    setSubmitting(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    setEmail(normalized);
    setOtp("");
    setStage("otp");
    setResendCooldown(RESEND_COOLDOWN_SECONDS);
  }

  async function verifyCode(code: string) {
    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });

    setSubmitting(false);

    if (verifyError) {
      setError(verifyError.message);
      setOtp("");
      otpRef.current?.clear();
      return;
    }

    router.replace("/reset-password");
    router.refresh();
  }

  async function onSubmitOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (otp.length !== 6 || submitting) return;
    await verifyCode(otp);
  }

  async function onResend() {
    if (resendCooldown > 0 || submitting) return;
    setError(null);
    setSubmitting(true);

    const authError = await requestCode(email);

    setSubmitting(false);

    if (authError) {
      setError(authError.message);
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
            RECOVERY · STEP 2
          </p>
        </div>
        <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
          Enter the code
        </h1>
        <hr className="mt-3 mb-8 w-12" />

        <p className="text-navy mb-6">
          We sent a 6-digit code to{" "}
          <span className="font-mono text-[14px]">{email}</span>. Enter it
          below to continue.
        </p>

        <form onSubmit={onSubmitOtp} className="flex flex-col gap-5" noValidate>
          <OtpInput
            ref={otpRef}
            value={otp}
            onChange={setOtp}
            onComplete={verifyCode}
            disabled={submitting}
            error={error ?? undefined}
            autoFocus
            label="6-digit code"
          />

          <Button
            type="submit"
            variant="primary"
            disabled={otp.length !== 6}
            loading={submitting}
          >
            Verify code
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
              setStage("email");
              setOtp("");
              setError(null);
            }}
            className="text-slate hover:text-navy text-[13px]"
          >
            Wrong email?
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
          RECOVERY
        </p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">
        Forgot password
      </h1>
      <hr className="mt-3 mb-8 w-12" />

      <p className="text-slate text-[14px] mb-6">
        Enter the email tied to your account and we&apos;ll send you a 6-digit
        code.
      </p>

      <form onSubmit={onSubmitEmail} className="flex flex-col gap-5" noValidate>
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
          Send code
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
