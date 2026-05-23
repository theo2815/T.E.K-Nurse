"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type Result<T = undefined> =
  | (T extends undefined ? { ok: true } : { ok: true } & T)
  | { ok: false; error: string };

function revalidateNotificationSurfaces() {
  revalidatePath("/staff/notifications");
  revalidatePath("/student/notifications");
  // "layout" form refreshes the TopBar bell on every page in both role trees.
  revalidatePath("/", "layout");
}

export async function markNotificationRead(input: {
  id: string;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to mark notifications read." };

  const { data, error } = await supabase
    .from("notification")
    .update({ is_read: true })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) {
    return {
      ok: false,
      error: "Notification not found or already marked read.",
    };
  }

  revalidateNotificationSurfaces();
  return { ok: true };
}

export async function markAllNotificationsRead(): Promise<
  Result<{ markedCount: number }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to mark notifications read." };

  const { data, error } = await supabase
    .from("notification")
    .update({ is_read: true })
    .eq("user_id", user.id)
    .eq("is_read", false)
    .select("id");

  if (error) return { ok: false, error: error.message };

  revalidateNotificationSurfaces();
  return { ok: true, markedCount: data?.length ?? 0 };
}
