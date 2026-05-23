"use client";

import { useState } from "react";
import { useProgressRouter } from "@/lib/use-progress-router";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { SpeedLines } from "@/components/SpeedLines";
import {
  PasswordChecklist,
  isPasswordStrong,
} from "@/components/PasswordChecklist";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useProgressRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const passwordIsStrong = isPasswordStrong(password);
  const passwordsMatch = password.length > 0 && password === confirm;

  const confirmError =
    confirm.length > 0 && password !== confirm
      ? "Passwords don't match."
      : undefined;

  const canSubmit = !submitting && passwordIsStrong && passwordsMatch;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setSubmitting(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    router.replace("/");
    router.refresh();
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
        Set a new password
      </h1>
      <hr className="mt-3 mb-8 w-12" />

      <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
        <div>
          <Input
            label="New password"
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

        {error && (
          <p
            role="alert"
            className="font-mono uppercase text-caps-sm text-red-deep tracking-[0.05em]"
          >
            ⚠  {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={!canSubmit} loading={submitting}>
          Update password
        </Button>
      </form>
    </>
  );
}
