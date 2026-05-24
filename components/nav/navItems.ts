import {
  Home,
  Inbox,
  Boxes,
  ClipboardList,
  Stethoscope,
  Package,
  ListChecks,
  History,
  BarChart3,
  Users,
  ScrollText,
  Settings,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  fab?: boolean;
  /** Render in BottomNav only (mobile). Hidden from SideNav. */
  mobileOnly?: boolean;
  /** Render in SideNav only (desktop). Hidden from BottomNav. */
  desktopOnly?: boolean;
  /** When true on a SideNav row, draws a hairline divider above it. */
  groupBreakBefore?: boolean;
  /** Only visible when the viewer's role is admin. */
  adminOnly?: boolean;
};

export const STAFF_NAV: NavItem[] = [
  { label: "Home",         href: "/staff/home",        icon: Home },
  { label: "Requests",     href: "/staff/requests",    icon: Inbox },
  { label: "Scan",         href: "/staff/scan",        icon: Home, fab: true },
  { label: "Loans",        href: "/staff/loans",       icon: ClipboardList },
  { label: "Inventory",    href: "/staff/inventory",   icon: Boxes },
  { label: "Reports",      href: "/staff/reports",     icon: BarChart3,  desktopOnly: true, groupBreakBefore: true },
  { label: "Students",     href: "/staff/students",    icon: Users,      desktopOnly: true },
  { label: "Audit log",    href: "/staff/audit-log",   icon: ScrollText, desktopOnly: true },
  { label: "Settings",     href: "/staff/settings",    icon: Settings,   desktopOnly: true },
  { label: "Manage users", href: "/staff/admin/users", icon: ShieldCheck, desktopOnly: true, adminOnly: true, groupBreakBefore: true },
];

export const STUDENT_NAV: NavItem[] = [
  { label: "Home",        href: "/student/home",        icon: Home },
  { label: "Equipment",   href: "/student/equipment",   icon: Stethoscope },
  { label: "Consumables", href: "/student/consumables", icon: Package },
  { label: "Requests",    href: "/student/requests",    icon: ListChecks },
  { label: "History",     href: "/student/history",     icon: History },
];
