"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  KeyRound,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProgressRouter } from "@/lib/use-progress-router";

/**
 * Three-up action strip at the bottom of the profile page. On desktop it
 * renders as one bordered card with vertical dividers between actions; on
 * mobile it stacks. Sign-out lives here in addition to the avatar menu
 * because the profile is a natural "wrap-up" surface.
 *
 * Edit profile / Change password both deep-link into the settings page
 * (#profile / #password anchors land in Slice 11.5c).
 */
export function QuickActionsStrip({
  settingsHref,
}: {
  settingsHref: string;
}) {
  const router = useProgressRouter();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <section
      aria-label="Quick actions"
      className="flex flex-col gap-2 md:flex-row md:gap-0 md:border-[1.5px] md:border-rule md:rounded md:bg-paper md:overflow-hidden"
    >
      <ActionLink
        href={`${settingsHref}#profile`}
        icon={<SettingsIcon size={16} strokeWidth={1.75} />}
        label="Edit profile"
      />
      <div aria-hidden className="hidden md:block w-px bg-rule" />
      <ActionLink
        href={`${settingsHref}#password`}
        icon={<KeyRound size={16} strokeWidth={1.75} />}
        label="Change password"
      />
      <div aria-hidden className="hidden md:block w-px bg-rule" />
      <button
        type="button"
        onClick={signOut}
        disabled={signingOut}
        className="flex-1 group inline-flex items-center justify-between gap-3 px-4 py-4 text-navy hover:text-red-deep transition-colors disabled:opacity-50 disabled:pointer-events-none"
      >
        <span className="inline-flex items-center gap-2.5 font-mono uppercase text-[14px] tracking-[0.1em] font-bold">
          <LogOut
            size={16}
            strokeWidth={1.75}
            className="text-slate group-hover:text-red-deep transition-colors"
            aria-hidden
          />
          {signingOut ? "Signing out…" : "Sign out"}
        </span>
        <ArrowRight
          size={14}
          strokeWidth={2}
          className="text-slate/40 group-hover:text-red-deep group-hover:translate-x-0.5 transition-transform"
          aria-hidden
        />
      </button>
    </section>
  );
}

function ActionLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex-1 group inline-flex items-center justify-between gap-3 px-4 py-4 text-navy hover:text-teal-deep transition-colors"
    >
      <span className="inline-flex items-center gap-2.5 font-mono uppercase text-[14px] tracking-[0.1em] font-bold">
        <span className="text-teal" aria-hidden>
          {icon}
        </span>
        {label}
      </span>
      <ArrowRight
        size={14}
        strokeWidth={2}
        className="text-slate/40 group-hover:text-teal group-hover:translate-x-0.5 transition-transform"
        aria-hidden
      />
    </Link>
  );
}
