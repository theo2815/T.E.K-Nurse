"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to borrow_transaction changes and triggers router.refresh().
 * Mount on the staff loans page so the list reflects new borrows, returns,
 * and OVERDUE transitions without a manual reload.
 */
export function StaffLoansRealtime() {
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
      channel = supabase
        .channel("staff:active-loans")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "borrow_transaction" },
          () => router.refresh(),
        );
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
