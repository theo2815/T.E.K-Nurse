"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, QrCode } from "lucide-react";
import { STAFF_NAV, STUDENT_NAV, type NavItem } from "./navItems";
import { NavBadge } from "./NavBadge";

export function SideNav({
  role,
  isAdmin = false,
  badges,
}: {
  role: "staff" | "student";
  isAdmin?: boolean;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const items = role === "staff" ? STAFF_NAV : STUDENT_NAV;

  const fabItem = items.find((i) => i.fab);
  const navItems = items.filter(
    (i) => !i.fab && !i.mobileOnly && (!i.adminOnly || isAdmin),
  );

  return (
    <nav
      aria-label="Primary"
      className="hidden md:flex flex-col fixed left-0 top-20 bottom-0 w-64 bg-paper border-r border-rule px-4 py-8"
    >
      <ul className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto">
        {navItems.map((item, idx) => (
          <NavRow
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            breakBefore={item.groupBreakBefore && idx > 0}
            badgeCount={badges?.[item.href] ?? 0}
          />
        ))}
      </ul>

      {fabItem && (
        <div className="shrink-0 pt-6">
          <Link
            href={fabItem.href}
            aria-label={fabItem.label}
            className="group flex items-center justify-between gap-3 w-full bg-teal hover:bg-teal-deep active:bg-navy-deep transition-colors text-white px-4 py-4 rounded"
          >
            <span className="flex items-center gap-3">
              <QrCode size={22} strokeWidth={1.75} aria-hidden />
              <span className="font-mono uppercase text-[15px] tracking-[0.12em] font-bold">
                {fabItem.label}
              </span>
            </span>
            <ArrowRight
              size={18}
              strokeWidth={2}
              aria-hidden
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
          <div className="mt-3 flex items-center gap-2 px-1">
            <span aria-hidden className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-teal animate-ping opacity-60" />
              <span className="relative inline-block h-2 w-2 rounded-full bg-teal" />
            </span>
            <span className="font-mono uppercase text-[11px] tracking-[0.1em] font-bold text-slate">
              Status · Ready
            </span>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavRow({
  item,
  active,
  breakBefore,
  badgeCount,
}: {
  item: NavItem;
  active: boolean;
  breakBefore?: boolean;
  badgeCount: number;
}) {
  const Icon = item.icon;
  return (
    <li className={breakBefore ? "mt-3 pt-3 border-t border-rule" : undefined}>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        className={`relative flex items-center gap-3.5 pl-5 pr-4 py-3 rounded transition-colors ${
          active
            ? "bg-mist text-navy font-semibold"
            : "text-navy/70 hover:text-navy hover:bg-mist/60"
        }`}
      >
        {active && (
          <span
            aria-hidden
            className="absolute left-0 top-2 bottom-2 w-[3px] bg-teal rounded-full"
          />
        )}
        <Icon size={20} strokeWidth={1.75} />
        <span className="text-[16px]">{item.label}</span>
        <NavBadge count={badgeCount} variant="inline" label={item.label} />
      </Link>
    </li>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
