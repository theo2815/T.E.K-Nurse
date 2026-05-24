"use client";

import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useProgressRouter } from "@/lib/use-progress-router";

/**
 * Single-row sign-out card. The previous "sign out everywhere" variant was
 * removed — for a school nursing lab the threat model doesn't warrant two
 * destructive sign-out options, and a single button is easier to find.
 *
 * The /login redirect is itself the visual confirmation that the sign-out
 * worked, so no toast fires here.
 */
export function SessionsBlock() {
  const router = useProgressRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function onSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="border-[1.5px] border-rule rounded bg-paper">
      <div className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5">
        <div className="flex items-start gap-3 min-w-0">
          <LogOut
            size={16}
            strokeWidth={2}
            className="text-slate mt-0.5 shrink-0"
          />
          <div className="min-w-0">
            <p className="text-[15px] text-navy font-medium">Sign out</p>
            <p className="text-[12px] text-slate mt-0.5">
              End your session on this device.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={onSignOut}
          loading={signingOut}
        >
          Sign out
        </Button>
      </div>
    </div>
  );
}
