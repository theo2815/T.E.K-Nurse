import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SpeedLines } from "@/components/SpeedLines";
import { ChevronRight } from "lucide-react";

const LINKS = [
  { label: "Reports",   phase: "Phase 10", href: "/staff/reports" },
  { label: "Students",  phase: "Phase 5",  href: "/staff/students" },
  { label: "Audit log", phase: "Phase 11", href: "/staff/audit-log" },
  { label: "Settings",  phase: "Phase 13", href: "/staff/settings" },
];

export default function StaffMorePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 md:px-12 py-12 md:py-16">
      <div className="flex items-center gap-3 mb-2">
        <SpeedLines className="w-12 h-5" />
        <p className="font-mono uppercase text-caps-sm text-teal font-semibold">MORE</p>
      </div>
      <h1 className="font-display italic font-extrabold text-display md:text-[48px] text-navy">More</h1>
      <hr className="mt-3 mb-10 w-12" />

      <Card>
        <ul className="divide-y divide-rule">
          {LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0 group"
              >
                <div>
                  <p className="font-display italic font-bold text-[20px] text-navy group-hover:underline underline-offset-4 decoration-teal decoration-2">
                    {link.label}
                  </p>
                  <p className="font-mono uppercase text-caps-sm text-slate mt-1 tracking-[0.05em]">
                    {link.phase}
                  </p>
                </div>
                <ChevronRight size={18} strokeWidth={1.5} className="text-slate" />
              </Link>
            </li>
          ))}
        </ul>
      </Card>

      <p className="mt-8 font-mono uppercase text-caps-sm text-slate tracking-[0.05em] italic">
        Sign out lives in the avatar menu, top right.
      </p>
    </div>
  );
}
