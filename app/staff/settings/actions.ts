"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isPasswordStrong } from "@/components/PasswordChecklist";

/**
 * Live preference toggle — used by the EmailNotificationsToggle component
 * on /staff/settings (and the equivalent on /student/settings, which has
 * its own re-exported copy). No role gate: every authenticated user owns
 * their own preference row.
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

  revalidatePath("/staff/settings");
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
 * Verifies the current password by attempting a re-auth on the same session,
 * then applies the new password via `auth.updateUser`. Supabase exposes no
 * `verifyPassword` API; `signInWithPassword` against the current user's email
 * either reissues the session (success) or returns an error without
 * disrupting the existing session (failure).
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
