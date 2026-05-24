"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useProgressRouter } from "@/lib/use-progress-router";
import {
  BarChart3,
  LogOut,
  ScrollText,
  Settings,
  ShieldCheck,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { InstallAppItem } from "@/components/pwa/InstallAppItem";
import { IosInstallModal } from "@/components/pwa/IosInstallModal";

type NavLink = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When true, hidden on md+ — the desktop sidebar already exposes these. */
  mobileOnly?: boolean;
  /** When true, only renders for admin viewers. */
  adminOnly?: boolean;
};

const STAFF_NAV_LINKS: NavLink[] = [
  { label: "Reports", href: "/staff/reports", icon: BarChart3, mobileOnly: true },
  { label: "Students", href: "/staff/students", icon: Users, mobileOnly: true },
  { label: "Audit log", href: "/staff/audit-log", icon: ScrollText, mobileOnly: true },
  { label: "Manage users", href: "/staff/admin/users", icon: ShieldCheck, mobileOnly: true, adminOnly: true },
  { label: "Profile", href: "/staff/profile", icon: UserCircle2 },
  { label: "Settings", href: "/staff/settings", icon: Settings },
];

const STUDENT_NAV_LINKS: NavLink[] = [
  { label: "Profile", href: "/student/profile", icon: UserCircle2 },
  { label: "Settings", href: "/student/settings", icon: Settings },
];

export function AvatarMenu({
  initials,
  fullName,
  email,
  role,
  isAdmin = false,
}: {
  initials: string;
  fullName: string;
  email: string;
  role: "staff" | "student";
  isAdmin?: boolean;
}) {
  const rawLinks = role === "staff" ? STAFF_NAV_LINKS : STUDENT_NAV_LINKS;
  const links = rawLinks.filter((l) => !l.adminOnly || isAdmin);
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [iosInstallOpen, setIosInstallOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useProgressRouter();

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

  const rowClass =
    "w-full flex items-center gap-2.5 text-left text-navy text-[15px] font-medium py-2.5 hover:underline underline-offset-4 decoration-teal decoration-2";

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

          <nav className="flex flex-col">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className={`${rowClass} ${link.mobileOnly ? "md:hidden" : ""}`}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  {link.label}
                </Link>
              );
            })}
            <InstallAppItem
              className={rowClass}
              onSelect={() => setOpen(false)}
              onIosRequest={() => setIosInstallOpen(true)}
            />
          </nav>

          <hr className="my-4" />

          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            disabled={signingOut}
            className={`${rowClass} disabled:opacity-50`}
          >
            <LogOut size={16} strokeWidth={1.5} />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      )}

      <IosInstallModal
        open={iosInstallOpen}
        onClose={() => setIosInstallOpen(false)}
      />
    </div>
  );
}
