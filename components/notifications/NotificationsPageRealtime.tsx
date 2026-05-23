"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to changes on this user's notification rows and triggers
 * router.refresh() on any insert/update/delete. Mount on NotificationsPage
 * so the inbox surface updates live when new notifications arrive.
 *
 * Same auth-then-subscribe ordering as NotificationBell: await getSession
 * and call realtime.setAuth before subscribe(), otherwise the websocket
 * opens with the anon key and RLS filters every broadcast out.
 */
export function NotificationsPageRealtime({ userId }: { userId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }
      channel = supabase
        .channel(`notifications-page:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "notification",
            filter: `user_id=eq.${userId}`,
          },
          () => router.refresh(),
        );
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, router]);

  return null;
}
