import { createClient } from "@/lib/supabase/server";

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
};

export async function listMyNotifications(
  opts: { limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationRow[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  let q = supabase
    .from("notification")
    .select("id, user_id, type, title, body, link_url, is_read, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (opts.unreadOnly) q = q.eq("is_read", false);
  if (opts.limit) q = q.limit(opts.limit);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function getUnreadCount(): Promise<number> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;

  const { count, error } = await supabase
    .from("notification")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);

  if (error) throw error;
  return count ?? 0;
}
