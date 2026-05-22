import Link from "next/link";
import Image from "next/image";
import { Bell } from "lucide-react";
import { AvatarMenu } from "./AvatarMenu";

export function TopBar({
  fullName,
  email,
  homeHref,
}: {
  fullName: string;
  email: string;
  homeHref: string;
}) {
  const initials = fullName
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 h-20 bg-mist/95 backdrop-blur-sm border-b border-rule flex items-center justify-between px-4 md:px-8">
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
        <button
          type="button"
          aria-label="Notifications"
          className="text-slate hover:text-navy transition-colors"
        >
          <Bell size={22} strokeWidth={1.75} />
        </button>
        <AvatarMenu initials={initials} fullName={fullName} email={email} />
      </div>
    </header>
  );
}
