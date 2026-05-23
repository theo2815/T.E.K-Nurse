"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Subscribes to changes on the student's borrow_request, consumable_request,
 * and borrow_transaction rows. Any change re-fetches the page via router.refresh().
 * Mount once on the My Requests page (any tab).
 */
export function RequestsRealtime({ studentId }: { studentId: string }) {
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
      channel = supabase.channel(`my-requests:${studentId}`);
      const tables = [
        "borrow_request",
        "consumable_request",
        "borrow_transaction",
      ] as const;
      for (const table of tables) {
        channel.on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table,
            filter: `student_id=eq.${studentId}`,
          },
          () => router.refresh(),
        );
      }
      channel.subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [studentId, router]);

  return null;
}
