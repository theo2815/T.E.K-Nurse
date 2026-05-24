import Link from "next/link";
import Image from "next/image";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import type { NotificationRow } from "@/lib/supabase/queries/notifications";
import { AvatarMenu } from "./AvatarMenu";

export function TopBar({
  userId,
  fullName,
  email,
  role,
  isAdmin = false,
  homeHref,
  initialUnreadCount,
  initialNotifications,
  notificationsHref,
}: {
  userId: string;
  fullName: string;
  email: string;
  role: "staff" | "student";
  isAdmin?: boolean;
  homeHref: string;
  initialUnreadCount: number;
  initialNotifications: NotificationRow[];
  notificationsHref: string;
}) {
  const initials = fullName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header
      className="sticky top-0 z-30 bg-mist/95 backdrop-blur-sm border-b border-rule flex items-center justify-between px-4 md:px-8 h-20"
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        height: "calc(5rem + env(safe-area-inset-top, 0px))",
      }}
    >
      <Link
        href={homeHref}
        className="flex items-center gap-3"
        aria-label="T.E.K Nurse home"
      >
        <Image
          src="/teknurselogo.png"
          alt="T.E.K Nurse"
          width={56}
          height={56}
          priority
          className="h-12 w-12 object-contain"
          style={{ mixBlendMode: "multiply" }}
        />
        <span className="font-display italic font-extrabold text-[22px] text-navy tracking-[-0.01em]">
          T.E.K <span className="text-teal">NURSE</span>
        </span>
      </Link>
      <div className="flex items-center gap-5">
        <NotificationBell
          userId={userId}
          initialUnreadCount={initialUnreadCount}
          initialRows={initialNotifications}
          fullPageHref={notificationsHref}
        />
        <AvatarMenu
          initials={initials}
          fullName={fullName}
          email={email}
          role={role}
          isAdmin={isAdmin}
        />
      </div>
    </header>
  );
}
