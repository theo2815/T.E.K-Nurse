import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/Card";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";

export default async function StaffProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("full_name, email, role, year_section")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) redirect("/login");

  const fields: Array<{ label: string; value: string; mono?: boolean }> = [
    { label: "Full name", value: profile.full_name },
    { label: "Email", value: profile.email, mono: true },
    { label: "Role", value: profile.role },
  ];
  if (profile.year_section) {
    fields.push({ label: "Year / Section", value: profile.year_section });
  }

  return (
    <div className="mx-auto max-w-3xl px-6 md:px-12 py-12 md:py-16 flex flex-col gap-8">
      <CatalogHeader eyebrow="Profile" title="Your account" />

      <Card>
        <dl className="divide-y divide-rule">
          {fields.map((f, idx) => (
            <div
              key={f.label}
              className={`flex flex-col gap-1 ${idx === 0 ? "pt-0" : "pt-4"} ${
                idx === fields.length - 1 ? "pb-0" : "pb-4"
              }`}
            >
              <dt className="font-mono uppercase text-caps-xs text-slate/70 tracking-[0.08em]">
                {f.label}
              </dt>
              <dd
                className={`text-navy text-[16px] ${
                  f.mono ? "font-mono text-[14px]" : ""
                }`}
              >
                {f.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      <p className="font-mono uppercase text-caps-sm text-slate tracking-[0.05em] italic">
        Profile editing arrives in Phase 13 alongside Settings.
      </p>
    </div>
  );
}
