"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Mirrors RequestsRealtime, but for the student home. Subscribes to the same
 * three row sources filtered by student_id so any state change pushed by
 * staff (approval, release, return, decline) flips the dashboard live.
 *
 * Auth-timing fix from Phase 9: await getSession before setAuth before
 * subscribe so the websocket carries the user JWT — without it RLS filters
 * every broadcast.
 */
export function StudentHomeRealtime({ studentId }: { studentId: string }) {
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
      channel = supabase.channel(`student-home:${studentId}`);
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
