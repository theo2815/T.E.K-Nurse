"use client";

import { AlertTriangle, Lock } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { PasswordChecklist } from "@/components/PasswordChecklist";

type Props = {
  mode: "view" | "edit";
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  onChangeCurrentPassword: (value: string) => void;
  onChangeNewPassword: (value: string) => void;
  onChangeConfirmPassword: (value: string) => void;
  error?: string | null;
};

/**
 * Presentational fields for the Security section of /staff/settings +
 * /student/settings. View mode renders a single locked "Password ••••••••"
 * row so the user can see the section exists; edit mode reveals the three
 * password inputs + strength checklist. Buttons + submit logic live in the
 * parent shell, not here.
 */
export function SecurityFields({
  mode,
  currentPassword,
  newPassword,
  confirmPassword,
  onChangeCurrentPassword,
  onChangeNewPassword,
  onChangeConfirmPassword,
  error,
}: Props) {
  if (mode === "view") {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="text-[15px] text-slate font-bold uppercase tracking-[0.08em]">
          Password
        </span>
        <div className="inline-flex items-center gap-3 rounded border-[1.5px] border-rule bg-mist py-3 px-4 text-navy">
          <Lock size={14} strokeWidth={2} className="text-slate" />
          <span className="font-mono text-[18px] tracking-[0.3em] text-navy/70">
            ••••••••
          </span>
          <span className="ml-auto font-mono text-caps-sm text-slate tracking-[0.08em]">
            Locked
          </span>
        </div>
      </div>
    );
  }

  const passwordsMatch =
    confirmPassword.length === 0 || newPassword === confirmPassword;
  const confirmInlineError = !passwordsMatch
    ? "Passwords don't match."
    : undefined;

  return (
    <div className="flex flex-col gap-5">
      <Input
        label="Current password"
        name="current_password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => onChangeCurrentPassword(e.target.value)}
        revealable
      />

      <div className="flex flex-col gap-3">
        <Input
          label="New password"
          name="new_password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => onChangeNewPassword(e.target.value)}
          revealable
        />
        {newPassword.length > 0 && <PasswordChecklist password={newPassword} />}
      </div>

      <Input
        label="Confirm new password"
        name="confirm_password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => onChangeConfirmPassword(e.target.value)}
        error={confirmInlineError}
        revealable
      />

      {error && (
        <div
          role="alert"
          className="border-l-[3px] border-red-deep bg-red-deep/5 px-4 py-3 rounded inline-flex items-start gap-2.5 text-red-deep"
        >
          <AlertTriangle
            size={16}
            strokeWidth={2}
            className="mt-0.5 shrink-0"
          />
          <p className="text-[14px] font-medium">{error}</p>
        </div>
      )}

      <p className="text-[12px] text-slate leading-snug">
        Leave all three password fields blank to skip changing your password
        when you save.
      </p>
    </div>
  );
}
