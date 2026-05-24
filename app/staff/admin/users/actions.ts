"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Result<T = void> = T extends void
  ? { ok: true } | { ok: false; error: string }
  : { ok: true; data: T } | { ok: false; error: string };

async function assertAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile || profile.role !== "admin") {
    return { ok: false, error: "Admin only." };
  }
  return { ok: true, userId: user.id };
}

function friendlyAdminError(message: string): string {
  if (/Only admins can (promote|demote)/i.test(message)) {
    return "Only admins can change user roles.";
  }
  if (/cannot change your own role/i.test(message)) {
    return "You cannot change your own role.";
  }
  if (/promote_to_staff only applies to students/i.test(message)) {
    return "This account is no longer a student. Refresh the page.";
  }
  if (/demote_to_student only applies to staff/i.test(message)) {
    return "This account is no longer staff. Refresh the page.";
  }
  if (/Admin accounts cannot be demoted/i.test(message)) {
    return "Admin accounts cannot be demoted.";
  }
  if (/Cannot promote a suspended account/i.test(message)) {
    return "Reinstate this student first, then promote them.";
  }
  if (/User not found/i.test(message)) {
    return "User not found — they may have just been deleted.";
  }
  return message;
}

const MAX_NOTE = 500;

function validateNote(note: string): string | null {
  const trimmed = note.trim();
  if (trimmed.length > MAX_NOTE) {
    return `Note is too long (${trimmed.length}/${MAX_NOTE} chars).`;
  }
  return null;
}

export async function promoteToStaff(input: {
  user_id: string;
  note: string;
  send_email: boolean;
}): Promise<Result> {
  const gate = await assertAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const noteError = validateNote(input.note);
  if (noteError) return { ok: false, error: noteError };

  const supabase = await createClient();
  const { error } = await supabase.rpc("promote_to_staff", {
    p_user_id: input.user_id,
    p_note: input.note.trim() || null,
    p_notify_email: input.send_email,
  });

  if (error) return { ok: false, error: friendlyAdminError(error.message) };

  revalidatePath("/staff/admin/users");
  return { ok: true };
}

// ============================================================================
// Staff invite flow (Phase 11.5d-inv)
// ============================================================================

const EMAIL_REGEX = /^[^\s@]+@cit\.edu$/i;
const MAX_NAME = 80;

function appBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

function friendlyInviteError(message: string): string {
  const lower = message.toLowerCase();
  if (
    lower.includes("already been registered") ||
    lower.includes("already exists") ||
    lower.includes("duplicate key")
  ) {
    return "An account with this email already exists. Promote them from the table instead.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many invites in a short window. Please wait a minute.";
  }
  if (lower.includes("invalid email")) {
    return "That email looks invalid. Double-check spelling.";
  }
  return message;
}

async function enqueueInviteEmail(args: {
  user_id: string;
  invite_url: string;
  full_name: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  // Use the SERVICE-ROLE client to enqueue. The user we just created via the
  // admin API does not yet have a session, so the SECURITY DEFINER on
  // enqueue_email runs as the service role caller, which has unrestricted
  // RLS access. The payload carries the magic link the drain job will render
  // into the email body.
  const admin = createAdminClient();
  const { error } = await admin.rpc("enqueue_email", {
    p_user_id: args.user_id,
    p_template: "staff_invite",
    p_payload: {
      invite_url: args.invite_url,
      full_name: args.full_name,
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function inviteStaff(input: {
  email: string;
  full_name: string;
}): Promise<Result> {
  const gate = await assertAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const email = input.email.trim().toLowerCase();
  const full_name = input.full_name.trim();

  if (!EMAIL_REGEX.test(email)) {
    return { ok: false, error: "Email must be a @cit.edu address." };
  }
  if (full_name.length === 0) {
    return { ok: false, error: "Full name is required." };
  }
  if (full_name.length > MAX_NAME) {
    return {
      ok: false,
      error: `Full name is too long (${full_name.length}/${MAX_NAME} chars).`,
    };
  }

  // generateLink creates the auth.users row AND returns the magic link.
  // Our handle_new_user trigger (0023) sees pending_role='staff' in metadata
  // and lands the row as staff with TEK-NNN + invited_at = now() in one
  // atomic transaction. If that trigger raises, the auth row rolls back and
  // we surface the error here.
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name, pending_role: "staff" },
      redirectTo: `${appBaseUrl()}/accept-invite`,
    },
  });

  if (error) return { ok: false, error: friendlyInviteError(error.message) };
  if (!data?.user || !data.properties?.action_link) {
    return { ok: false, error: "Supabase returned no invite link." };
  }

  const enqueueResult = await enqueueInviteEmail({
    user_id: data.user.id,
    invite_url: data.properties.action_link,
    full_name,
  });
  if (!enqueueResult.ok) {
    // The auth user was created but the email failed to queue. Roll back the
    // user so the admin can retry from a clean state.
    await admin.auth.admin.deleteUser(data.user.id);
    return {
      ok: false,
      error: `Invite created but email failed to queue: ${enqueueResult.error}. Rolled back.`,
    };
  }

  revalidatePath("/staff/admin/users");
  return { ok: true };
}

export async function resendStaffInvite(input: {
  user_id: string;
}): Promise<Result> {
  const gate = await assertAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .from("users")
    .select("email, full_name, invited_at, invite_accepted_at")
    .eq("id", input.user_id)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };
  if (!target) return { ok: false, error: "User not found." };
  if (target.invited_at === null) {
    return { ok: false, error: "This user wasn't invited via the invite flow." };
  }
  if (target.invite_accepted_at !== null) {
    return { ok: false, error: "This user already accepted their invite." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email: target.email,
    options: {
      data: { full_name: target.full_name, pending_role: "staff" },
      redirectTo: `${appBaseUrl()}/accept-invite`,
    },
  });

  if (error) return { ok: false, error: friendlyInviteError(error.message) };
  if (!data?.properties?.action_link) {
    return { ok: false, error: "Supabase returned no invite link." };
  }

  const enqueueResult = await enqueueInviteEmail({
    user_id: input.user_id,
    invite_url: data.properties.action_link,
    full_name: target.full_name,
  });
  if (!enqueueResult.ok) {
    return { ok: false, error: enqueueResult.error };
  }

  revalidatePath("/staff/admin/users");
  return { ok: true };
}

export async function cancelStaffInvite(input: {
  user_id: string;
}): Promise<Result> {
  const gate = await assertAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const supabase = await createClient();
  const { data: target, error: lookupError } = await supabase
    .from("users")
    .select("invited_at, invite_accepted_at")
    .eq("id", input.user_id)
    .maybeSingle();

  if (lookupError) return { ok: false, error: lookupError.message };
  if (!target) return { ok: false, error: "User not found." };
  if (target.invited_at === null) {
    return { ok: false, error: "This user wasn't invited via the invite flow." };
  }
  if (target.invite_accepted_at !== null) {
    return {
      ok: false,
      error:
        "This user already accepted — they're a real staff member. Use Demote instead.",
    };
  }

  // ON DELETE CASCADE on public.users.id → public.users row vanishes too.
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(input.user_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/staff/admin/users");
  return { ok: true };
}

export async function demoteToStudent(input: {
  user_id: string;
  note: string;
  send_email: boolean;
}): Promise<Result> {
  const gate = await assertAdmin();
  if (!gate.ok) return { ok: false, error: gate.error };

  const noteError = validateNote(input.note);
  if (noteError) return { ok: false, error: noteError };

  const supabase = await createClient();
  const { error } = await supabase.rpc("demote_to_student", {
    p_user_id: input.user_id,
    p_note: input.note.trim() || null,
    p_notify_email: input.send_email,
  });

  if (error) return { ok: false, error: friendlyAdminError(error.message) };

  revalidatePath("/staff/admin/users");
  return { ok: true };
}
