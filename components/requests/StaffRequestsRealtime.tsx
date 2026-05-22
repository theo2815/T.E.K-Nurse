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
    const channel = supabase.channel("staff:pending-queue");

    for (const table of ["borrow_request", "consumable_request"] as const) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => router.refresh(),
      );
    }

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
