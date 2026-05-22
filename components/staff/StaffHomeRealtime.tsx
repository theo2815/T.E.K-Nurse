"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Refreshes the staff dashboard when relevant rows change.
 * Listens to all the tables that feed the home dashboard.
 */
export function StaffHomeRealtime() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("staff:home");

    for (const table of [
      "borrow_request",
      "consumable_request",
      "borrow_transaction",
      "consumable_usage",
    ] as const) {
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
