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
    const channel = supabase
      .channel("staff:active-loans")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "borrow_transaction" },
        () => router.refresh(),
      );

    channel.subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
