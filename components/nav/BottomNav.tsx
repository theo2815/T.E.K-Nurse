"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode } from "lucide-react";
import { STAFF_NAV, STUDENT_NAV } from "./navItems";

export function BottomNav({ role }: { role: "staff" | "student" }) {
  const pathname = usePathname();
  const items = (role === "staff" ? STAFF_NAV : STUDENT_NAV).filter(
    (i) => !i.desktopOnly,
  );

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-paper border-t border-rule"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <ul className="h-16 grid grid-cols-5 items-center">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          if (item.fab) {
            return (
              <li key={item.href} className="flex justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className="-mt-6 w-14 h-14 rounded-fab bg-teal text-white flex flex-col items-center justify-center hover:bg-teal-deep active:bg-navy-deep transition-colors"
                >
                  <QrCode size={22} strokeWidth={1.5} />
                </Link>
              </li>
            );
          }

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className="relative flex flex-col items-center gap-1 py-2"
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute top-0 h-[2px] w-8 bg-teal"
                  />
                )}
                <Icon
                  size={24}
                  strokeWidth={1.75}
                  className={active ? "text-navy" : "text-navy/50"}
                />
                <span
                  className={`font-mono uppercase text-[11px] tracking-[0.05em] font-semibold ${
                    active ? "text-navy" : "text-navy/50"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
