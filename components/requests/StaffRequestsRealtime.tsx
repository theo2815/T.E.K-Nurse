"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to changes on borrow_request and consumable_request and triggers
 * router.refresh() on any insert/update/delete. Mount on the staff queue page.
 * No filter — staff sees all rows.
 */
export function StaffRequestsRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // Await session before subscribing so the realtime websocket carries
    // the user's JWT — otherwise RLS-protected broadcasts are filtered out.
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session?.access_token) {
        supabase.realtime.setAuth(data.session.access_token);
      }
      channel = supabase.channel("staff:pending-queue");
      for (const table of ["borrow_request", "consumable_request"] as const) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          () => router.refresh(),
        );
      }
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
