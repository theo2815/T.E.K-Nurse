"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPasswordStrong } from "@/components/PasswordChecklist";

/**
 * Live preference toggle — used by the EmailNotificationsToggle component
 * on /student/settings (mirror of the staff version).
 */
export async function setEmailNotificationsEnabled(
  enabled: boolean,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in." };

  const { error } = await supabase
    .from("users")
    .update({ email_notifications_enabled: enabled })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/student/settings");
  return {};
}

export type ChangePasswordState = {
  error?: string;
  success?: string;
};

const FRIENDLY: Array<[RegExp, string]> = [
  [/invalid login credentials/i, "Current password is incorrect."],
  [
    /new password should be different/i,
    "New password must be different from your current password.",
  ],
  [
    /password should be at least/i,
    "New password does not meet all strength requirements.",
  ],
  [/rate limit/i, "Too many attempts. Wait a minute, then try again."],
];

function friendlyAuthError(message: string): string {
  for (const [regex, friendly] of FRIENDLY) {
    if (regex.test(message)) return friendly;
  }
  return message;
}

/**
 * Student self-service password change. Mirrors the staff action — Supabase
 * has no `verifyPassword` API, so we re-auth via `signInWithPassword` (which
 * either reissues the session or returns an error without disrupting it)
 * before applying the new password.
 */
export async function changeMyPassword(
  _prev: ChangePasswordState | null,
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get("current_password") ?? "");
  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (!currentPassword) return { error: "Enter your current password." };
  if (!newPassword) return { error: "Enter a new password." };
  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }
  if (newPassword === currentPassword) {
    return {
      error: "New password must be different from your current password.",
    };
  }
  if (!isPasswordStrong(newPassword)) {
    return { error: "New password does not meet all strength requirements." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { error: "You're signed out. Please sign in again." };
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { error: friendlyAuthError(verifyError.message) };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    return { error: friendlyAuthError(updateError.message) };
  }

  return { success: "Password changed." };
}
