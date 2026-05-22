"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AvatarMenu({
  initials,
  fullName,
  email,
}: {
  initials: string;
  fullName: string;
  email: string;
}) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className="w-11 h-11 rounded-fab bg-navy text-white font-mono uppercase text-[14px] tracking-[0.05em] font-bold flex items-center justify-center hover:bg-navy-deep transition-colors"
      >
        {initials || "?"}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 bg-paper border-[1.5px] border-rule rounded p-4 z-40"
        >
          <p className="font-display italic font-bold text-[20px] text-navy leading-tight">
            {fullName}
          </p>
          <p className="font-mono text-[13px] text-slate truncate mt-1">
            {email}
          </p>
          <hr className="my-4" />
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="w-full flex items-center gap-2.5 text-left text-navy text-[15px] font-medium py-2 disabled:opacity-50 hover:underline underline-offset-4 decoration-teal decoration-2"
          >
            <LogOut size={16} strokeWidth={1.5} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}
